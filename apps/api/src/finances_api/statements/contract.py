from collections.abc import Callable
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class TransactionCandidate:
    row_number: int
    transaction_date: date
    amount_minor: int
    raw_description: str
    source_key: str
    balance_after_minor: int | None = None
    source_type: str | None = None
    source_reference: str | None = None


@dataclass(frozen=True)
class RowError:
    row_number: int | None
    message: str


@dataclass(frozen=True)
class ParsedStatement:
    candidates: tuple[TransactionCandidate, ...]


@dataclass(frozen=True)
class InvalidStatement:
    errors: tuple[RowError, ...]


ParseResult = ParsedStatement | InvalidStatement
StatementParser = Callable[[bytes], ParseResult]
