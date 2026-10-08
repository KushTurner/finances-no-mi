import warnings
from datetime import date

from ofx_helpers import bank_statement_ofx, credit_card_statement_ofx, ofx_transaction

from finances_api.statements.ofx import (
    InvalidStatement,
    ParsedStatement,
    ParseResult,
    StatementAccount,
    StatementError,
    StatementTransaction,
    parse_ofx,
)


def parsed(result: ParseResult) -> ParsedStatement:
    assert isinstance(result, ParsedStatement), result
    return result


def only_transaction(content: bytes) -> StatementTransaction:
    (transaction,) = parsed(parse_ofx(content)).transactions
    return transaction


def test_reads_bank_account_identifiers_as_supplied() -> None:
    content = bank_statement_ofx(acctid="00012345", bankid="600000")

    account = parsed(parse_ofx(content)).account

    assert account == StatementAccount(
        acctid="00012345",
        bankid="600000",
        org=None,
        fid=None,
        account_type="current_account",
    )


def test_reads_savings_account_type() -> None:
    content = bank_statement_ofx(accttype="SAVINGS")

    account = parsed(parse_ofx(content)).account

    assert account.account_type == "savings"


def test_reads_credit_card_account_and_institution_identifiers() -> None:
    content = credit_card_statement_ofx(acctid="XXXX-0001", org="SYNTH", fid="1234")

    account = parsed(parse_ofx(content)).account

    assert account == StatementAccount(
        acctid="XXXX-0001",
        bankid=None,
        org="SYNTH",
        fid="1234",
        account_type="credit_card",
    )


def test_converts_a_transaction_into_the_canonical_model() -> None:
    content = bank_statement_ofx(
        ofx_transaction(
            fitid="SYNTH-7", trntype="POS", dtposted="20260903", trnamt="-4.50", name="CAFE"
        )
    )

    transaction = only_transaction(content)

    assert transaction == StatementTransaction(
        position=1,
        fitid="SYNTH-7",
        transaction_date=date(2026, 9, 3),
        amount_minor=-450,
        source_type="POS",
        raw_description="CAFE",
        memo=None,
    )


def test_income_and_refunds_are_positive_pence() -> None:
    content = credit_card_statement_ofx(ofx_transaction(trntype="CREDIT", trnamt="12.3"))

    transaction = only_transaction(content)

    assert transaction.amount_minor == 1230


def test_keeps_the_source_date_when_the_time_has_a_positive_offset() -> None:
    content = bank_statement_ofx(ofx_transaction(dtposted="20260903000000[+1:BST]"))

    transaction = only_transaction(content)

    assert transaction.transaction_date == date(2026, 9, 3)


def test_describes_a_transaction_by_its_name_and_keeps_the_memo_separately() -> None:
    content = bank_statement_ofx(ofx_transaction(name="SYNTHETIC CAFE", memo="AB SAMPLE-0001"))

    transaction = only_transaction(content)

    assert (transaction.raw_description, transaction.memo) == ("SYNTHETIC CAFE", "AB SAMPLE-0001")


def test_numbers_transactions_by_their_position_in_the_statement() -> None:
    content = bank_statement_ofx(ofx_transaction(fitid="A"), ofx_transaction(fitid="B"))

    transactions = parsed(parse_ofx(content)).transactions

    assert [(t.position, t.fitid) for t in transactions] == [(1, "A"), (2, "B")]


def test_keeps_same_valued_transactions_with_distinct_fitids() -> None:
    content = bank_statement_ofx(ofx_transaction(fitid="A"), ofx_transaction(fitid="B"))

    transactions = parsed(parse_ofx(content)).transactions

    assert len(transactions) == 2


def test_parses_ofx_2_xml() -> None:
    content = b"""<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<DTSERVER>20260910120000</DTSERVER><LANGUAGE>ENG</LANGUAGE></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1</TRNUID>
<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>
<STMTRS><CURDEF>GBP</CURDEF><BANKACCTFROM><BANKID>600000</BANKID><ACCTID>12345678</ACCTID>
<ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM><BANKTRANLIST>
<DTSTART>20260901</DTSTART><DTEND>20260910</DTEND>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260903</DTPOSTED><TRNAMT>-1.00</TRNAMT>
<FITID>XML-1</FITID><NAME>SYNTHETIC SHOP</NAME></STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>99.00</BALAMT><DTASOF>20260910</DTASOF></LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>
"""

    transaction = only_transaction(content)

    assert (transaction.fitid, transaction.amount_minor) == ("XML-1", -100)


def test_rejects_a_file_that_is_not_ofx() -> None:
    result = parse_ofx(b"Date,Description,Amount\n03/09/2026,SYNTHETIC,1.00\n")

    assert result == InvalidStatement(
        (StatementError(None, "File is not a readable OFX statement"),)
    )


def test_rejects_a_malformed_amount_as_unreadable() -> None:
    result = parse_ofx(bank_statement_ofx(ofx_transaction(trnamt="four pounds")))

    assert result == InvalidStatement(
        (StatementError(None, "File is not a readable OFX statement"),)
    )


def test_rejects_a_file_with_more_than_one_statement() -> None:
    single = bank_statement_ofx().decode()
    start = single.index("<STMTTRNRS>")
    end = single.index("</STMTTRNRS>") + len("</STMTTRNRS>")
    content = (single[:end] + single[start:end] + single[end:]).encode()

    result = parse_ofx(content)

    assert result == InvalidStatement(
        (StatementError(None, "File must contain exactly one account statement"),)
    )


def test_rejects_a_statement_in_another_currency() -> None:
    result = parse_ofx(bank_statement_ofx(curdef="EUR"))

    assert result == InvalidStatement((StatementError(None, "Only GBP statements are supported"),))


def test_rejects_a_transaction_in_another_currency() -> None:
    foreign = ofx_transaction().replace(
        "</STMTTRN>", "<CURRENCY><CURRATE>1.2<CURSYM>EUR</CURRENCY></STMTTRN>"
    )

    result = parse_ofx(bank_statement_ofx(foreign))

    assert result == InvalidStatement((StatementError(1, "Only GBP transactions are supported"),))


def test_reports_every_invalid_transaction_by_position() -> None:
    content = bank_statement_ofx(
        ofx_transaction(fitid="A"),
        ofx_transaction(fitid="B", trnamt="-1.005"),
        ofx_transaction(fitid="C", name=None, memo="SYNTHETIC MEMO"),
        ofx_transaction(fitid="A"),
    )

    result = parse_ofx(content)

    assert result == InvalidStatement(
        (
            StatementError(2, "TRNAMT has more than two decimal places"),
            StatementError(3, "NAME is required"),
            StatementError(4, "FITID is repeated in this statement"),
        )
    )


def test_rejects_a_statement_without_transactions() -> None:
    content = bank_statement_ofx(ofx_transaction()).replace(ofx_transaction().encode(), b"")

    result = parse_ofx(content)

    assert result == InvalidStatement((StatementError(None, "File contains no transactions"),))


def test_does_not_emit_warnings_quoting_transaction_names() -> None:
    content = bank_statement_ofx(ofx_transaction(name="SYNTHETIC NAME LONGER THAN 32 CHARACTERS"))

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        parse_ofx(content)

    assert caught == []
