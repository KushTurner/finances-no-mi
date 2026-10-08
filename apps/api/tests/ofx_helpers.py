SGML_HEADER = """OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

"""

SIGNON = (
    "<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS>"
    "<DTSERVER>20260910120000<LANGUAGE>ENG{fi}</SONRS></SIGNONMSGSRSV1>"
)


def ofx_transaction(
    *,
    fitid: str = "SYNTH-1",
    trntype: str = "DEBIT",
    dtposted: str = "20260903",
    trnamt: str = "-4.50",
    name: str | None = "SYNTHETIC CAFE",
    memo: str | None = None,
) -> str:
    return (
        f"<STMTTRN><TRNTYPE>{trntype}<DTPOSTED>{dtposted}<TRNAMT>{trnamt}<FITID>{fitid}"
        + (f"<NAME>{name}" if name is not None else "")
        + (f"<MEMO>{memo}" if memo is not None else "")
        + "</STMTTRN>"
    )


def bank_statement_ofx(
    *transactions: str,
    acctid: str = "12345678",
    bankid: str = "600000",
    accttype: str = "CHECKING",
    curdef: str = "GBP",
) -> bytes:
    if not transactions:
        transactions = (ofx_transaction(),)
    body = (
        "<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>"
        f"<STMTRS><CURDEF>{curdef}"
        f"<BANKACCTFROM><BANKID>{bankid}<ACCTID>{acctid}<ACCTTYPE>{accttype}</BANKACCTFROM>"
        f"<BANKTRANLIST><DTSTART>20260901<DTEND>20260910{''.join(transactions)}</BANKTRANLIST>"
        "<LEDGERBAL><BALAMT>100.00<DTASOF>20260910</LEDGERBAL>"
        "</STMTRS></STMTTRNRS></BANKMSGSRSV1>"
    )
    return _sgml(SIGNON.format(fi="") + body)


def credit_card_statement_ofx(
    *transactions: str, acctid: str = "XXXX-0001", org: str = "SYNTH", fid: str = "1234"
) -> bytes:
    if not transactions:
        transactions = (ofx_transaction(),)
    body = (
        "<CREDITCARDMSGSRSV1><CCSTMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>"
        f"<CCSTMTRS><CURDEF>GBP<CCACCTFROM><ACCTID>{acctid}</CCACCTFROM>"
        f"<BANKTRANLIST><DTSTART>20260901<DTEND>20260910{''.join(transactions)}</BANKTRANLIST>"
        "<LEDGERBAL><BALAMT>-100.00<DTASOF>20260910</LEDGERBAL>"
        "</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1>"
    )
    return _sgml(SIGNON.format(fi=f"<FI><ORG>{org}<FID>{fid}</FI>") + body)


def _sgml(messages: str) -> bytes:
    return f"{SGML_HEADER}<OFX>{messages}</OFX>".encode("ascii")
