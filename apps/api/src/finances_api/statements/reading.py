import csv
import io
from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import replace

from finances_api.statements.contract import (
    InvalidStatement,
    ParsedStatement,
    ParseResult,
    RowError,
    TransactionCandidate,
)
from finances_api.statements.fields import InvalidRow, Row
from finances_api.statements.source_keys import numbered_repeat_key

RowParser = Callable[[int, Row], TransactionCandidate]


def parse_statement(
    content: bytes, required_columns: Sequence[str], parse_row: RowParser
) -> ParseResult:
    try:
        records = read_records(content)
    except (UnicodeDecodeError, csv.Error):
        return _file_error("File is not a readable UTF-8 CSV")

    header_index = find_header(records, required_columns)
    if header_index is None:
        return _file_error(f"Expected a header row with columns: {', '.join(required_columns)}")

    candidates, errors = _parse_data_records(records, header_index, parse_row)
    if errors:
        return InvalidStatement(tuple(errors))
    if not candidates:
        return _file_error("File contains no transactions")
    return ParsedStatement(tuple(candidates))


def read_records(content: bytes) -> list[list[str]]:
    text = content.decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text, newline=""), strict=True))


def find_header(records: list[list[str]], required_columns: Sequence[str]) -> int | None:
    return next(
        (index for index, record in enumerate(records) if set(required_columns) <= set(record)),
        None,
    )


def _parse_data_records(
    records: list[list[str]], header_index: int, parse_row: RowParser
) -> tuple[list[TransactionCandidate], list[RowError]]:
    header = records[header_index]
    candidates: list[TransactionCandidate] = []
    errors: list[RowError] = []
    occurrences_by_source_key: Counter[str] = Counter()

    for row_number, record in enumerate(records[header_index + 1 :], start=header_index + 2):
        if not any(cell.strip() for cell in record):
            continue
        try:
            candidate = _parse_record(header, record, row_number, parse_row)
        except InvalidRow as error:
            errors.append(RowError(row_number, str(error)))
            continue

        occurrences_by_source_key[candidate.source_key] += 1
        occurrence = occurrences_by_source_key[candidate.source_key]
        if occurrence > 1:
            candidate = replace(
                candidate, source_key=numbered_repeat_key(candidate.source_key, occurrence)
            )
        candidates.append(candidate)

    return candidates, errors


def _parse_record(
    header: list[str], record: list[str], row_number: int, parse_row: RowParser
) -> TransactionCandidate:
    if len(record) != len(header):
        raise InvalidRow(f"Expected {len(header)} columns but found {len(record)}")
    return parse_row(row_number, dict(zip(header, record, strict=True)))


def _file_error(message: str) -> InvalidStatement:
    return InvalidStatement((RowError(None, message),))
