import csv
import io
from collections.abc import Sequence

from finances_api.statements.contract import ParsedStatement, ParseResult, TransactionCandidate


def csv_bytes(
    records: Sequence[Sequence[str]], *, line_terminator: str = "\n", encoding: str = "utf-8"
) -> bytes:
    buffer = io.StringIO()
    csv.writer(buffer, lineterminator=line_terminator).writerows(records)
    return buffer.getvalue().encode(encoding)


def candidates_of(result: ParseResult) -> tuple[TransactionCandidate, ...]:
    assert isinstance(result, ParsedStatement), result
    return result.candidates
