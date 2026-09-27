from finances_api.statements import amex, nationwide, natwest
from finances_api.statements.contract import StatementParser

PARSERS_BY_INSTITUTION: dict[str, StatementParser] = {
    "amex": amex.parse,
    "natwest": natwest.parse,
    "nationwide": nationwide.parse,
}
