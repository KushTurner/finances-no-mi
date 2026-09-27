from collections.abc import Callable, Mapping

from finances_api.models import Institution
from finances_api.statements import amex, nationwide, natwest
from finances_api.statements.contract import ParseResult

StatementParser = Callable[[bytes], ParseResult]

PARSERS_BY_INSTITUTION: Mapping[Institution, StatementParser] = {
    "amex": amex.parse,
    "natwest": natwest.parse,
    "nationwide": nationwide.parse,
}
