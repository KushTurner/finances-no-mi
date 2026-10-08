import io
import logging
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from ofxtools.models import CCSTMTRS, STMTRS, STMTTRN
from ofxtools.Parser import OFXTree

from finances_api.models import AccountType

# ofxtools logs element text, including statement contents, at DEBUG level.
logging.getLogger("ofxtools").setLevel(logging.WARNING)

ACCOUNT_TYPES_BY_OFX_ACCTTYPE: dict[str, AccountType] = {
    "CHECKING": "current_account",
    "SAVINGS": "savings",
}


@dataclass(frozen=True)
class StatementAccount:
    acctid: str
    bankid: str | None
    org: str | None
    fid: str | None
    account_type: AccountType | None


@dataclass(frozen=True)
class StatementTransaction:
    position: int
    fitid: str
    transaction_date: date
    amount_minor: int
    source_type: str
    raw_description: str
    memo: str | None


@dataclass(frozen=True)
class ParsedStatement:
    account: StatementAccount
    transactions: tuple[StatementTransaction, ...]


@dataclass(frozen=True)
class StatementError:
    position: int | None
    message: str


@dataclass(frozen=True)
class InvalidStatement:
    errors: tuple[StatementError, ...]


ParseResult = ParsedStatement | InvalidStatement


class InvalidTransaction(Exception):
    pass


def parse_ofx(content: bytes) -> ParseResult:
    tree = OFXTree()
    try:
        root = tree.parse(io.BytesIO(content))
        ofx: Any = tree.convert()
    except (SyntaxError, ValueError, InvalidOperation):
        return _file_error("File is not a readable OFX statement")

    statements = ofx.statements
    if len(statements) != 1:
        return _file_error("File must contain exactly one account statement")
    statement = statements[0]
    if not isinstance(statement, STMTRS | CCSTMTRS):
        return _file_error("Only bank and credit card statements are supported")
    if statement.curdef != "GBP":
        return _file_error("Only GBP statements are supported")

    account = _read_account(ofx, statement)
    if account is None:
        return _file_error("Statement has no account identifier")

    raw_dates = [element.findtext("DTPOSTED") or "" for element in root.iter("STMTTRN")]
    transactions, errors = _read_transactions(list(statement.banktranlist or []), raw_dates)
    if errors:
        return InvalidStatement(tuple(errors))
    if not transactions:
        return _file_error("File contains no transactions")
    return ParsedStatement(account, tuple(transactions))


def _read_account(ofx: Any, statement: STMTRS | CCSTMTRS) -> StatementAccount | None:
    acctfrom: Any = statement.account
    acctid = acctfrom.acctid
    if not acctid or not acctid.strip():
        return None

    fi = ofx.signonmsgsrsv1.sonrs.fi
    if isinstance(statement, CCSTMTRS):
        bankid = None
        account_type: AccountType | None = "credit_card"
    else:
        bankid = acctfrom.bankid
        account_type = ACCOUNT_TYPES_BY_OFX_ACCTTYPE.get(acctfrom.accttype)
    return StatementAccount(
        acctid=acctid,
        bankid=bankid,
        org=fi.org if fi is not None else None,
        fid=fi.fid if fi is not None else None,
        account_type=account_type,
    )


def _read_transactions(
    stmttrns: list[STMTTRN], raw_dates: list[str]
) -> tuple[list[StatementTransaction], list[StatementError]]:
    transactions: list[StatementTransaction] = []
    errors: list[StatementError] = []
    seen_fitids: set[str] = set()

    for position, (stmttrn, raw_date) in enumerate(zip(stmttrns, raw_dates, strict=True), 1):
        try:
            transaction = _read_transaction(position, stmttrn, raw_date)
        except InvalidTransaction as error:
            errors.append(StatementError(position, str(error)))
            continue
        if transaction.fitid in seen_fitids:
            errors.append(StatementError(position, "FITID is repeated in this statement"))
            continue
        seen_fitids.add(transaction.fitid)
        transactions.append(transaction)

    return transactions, errors


def _read_transaction(position: int, stmttrn: Any, raw_date: str) -> StatementTransaction:
    if stmttrn.currency is not None and stmttrn.currency.cursym != "GBP":
        raise InvalidTransaction("Only GBP transactions are supported")
    return StatementTransaction(
        position=position,
        fitid=_read_fitid(stmttrn.fitid),
        transaction_date=_read_source_date(raw_date),
        amount_minor=_read_pence(stmttrn.trnamt),
        source_type=stmttrn.trntype,
        raw_description=_read_name(stmttrn.name),
        memo=stmttrn.memo,
    )


def _read_fitid(fitid: str | None) -> str:
    if not fitid or not fitid.strip():
        raise InvalidTransaction("FITID is required")
    return fitid


def _read_source_date(raw_date: str) -> date:
    # ofxtools converts DTPOSTED to UTC, which can move a date with a positive offset
    # (such as BST midnight) to the previous day, so the date is read from the source text.
    return datetime.strptime(raw_date[:8], "%Y%m%d").date()


def _read_pence(amount: Decimal) -> int:
    pence = amount * 100
    if pence != pence.to_integral_value():
        raise InvalidTransaction("TRNAMT has more than two decimal places")
    return int(pence)


def _read_name(name: str | None) -> str:
    if not name or not name.strip():
        raise InvalidTransaction("NAME is required")
    return name


def _file_error(message: str) -> InvalidStatement:
    return InvalidStatement((StatementError(None, message),))
