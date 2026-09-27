import hashlib
from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.merchant_keys import normalize_merchant_key
from finances_api.models import (
    Account,
    ImportFile,
    ImportFileTransaction,
    MerchantKey,
    Transaction,
)
from finances_api.statements.contract import InvalidStatement, RowError, TransactionCandidate
from finances_api.statements.parsers import PARSERS_BY_INSTITUTION


@dataclass(frozen=True)
class ImportCompleted:
    import_id: int
    new_transaction_count: int
    existing_transaction_count: int


@dataclass(frozen=True)
class DuplicateImport:
    pass


ImportResult = ImportCompleted | DuplicateImport | InvalidStatement


def import_statement(
    session: Session, account: Account, filename: str, content: bytes
) -> ImportResult:
    content_sha256 = hashlib.sha256(content).hexdigest()
    if _is_already_imported(session, content_sha256):
        return DuplicateImport()

    parse = PARSERS_BY_INSTITUTION.get(account.institution)
    if parse is None:
        return InvalidStatement(
            (RowError(None, "Statement imports are not supported for this account"),)
        )

    result = parse(content)
    if isinstance(result, InvalidStatement):
        return result

    candidates = result.candidates
    existing_transactions = _existing_transactions(session, account.id, candidates)
    merchant_key_ids = _merchant_key_ids(session, candidates)
    new_transactions = {
        candidate.source_key: _new_transaction(account.id, candidate, merchant_key_ids)
        for candidate in candidates
        if candidate.source_key not in existing_transactions
    }
    import_file = ImportFile(
        account_id=account.id,
        original_filename=filename,
        content_sha256=content_sha256,
        content=content,
    )
    session.add(import_file)
    session.add_all(new_transactions.values())
    session.flush()

    transactions = existing_transactions | new_transactions
    session.add_all(
        ImportFileTransaction(
            import_file_id=import_file.id,
            transaction_id=transactions[candidate.source_key].id,
            row_number=candidate.row_number,
        )
        for candidate in candidates
    )
    session.commit()

    return ImportCompleted(
        import_id=import_file.id,
        new_transaction_count=len(new_transactions),
        existing_transaction_count=len(existing_transactions),
    )


def _is_already_imported(session: Session, content_sha256: str) -> bool:
    import_id = session.scalar(
        select(ImportFile.id).where(ImportFile.content_sha256 == content_sha256)
    )
    return import_id is not None


def _existing_transactions(
    session: Session, account_id: int, candidates: Iterable[TransactionCandidate]
) -> dict[str, Transaction]:
    source_keys = [candidate.source_key for candidate in candidates]
    transactions = session.scalars(
        select(Transaction).where(
            Transaction.account_id == account_id, Transaction.source_key.in_(source_keys)
        )
    )
    return {transaction.source_key: transaction for transaction in transactions}


def _merchant_key_ids(
    session: Session, candidates: Sequence[TransactionCandidate]
) -> dict[str, int]:
    values = {normalize_merchant_key(candidate.raw_description) for candidate in candidates}
    merchant_keys = {
        merchant_key.value: merchant_key
        for merchant_key in session.scalars(
            select(MerchantKey).where(MerchantKey.value.in_(values))
        )
    }
    new_merchant_keys = [MerchantKey(value=value) for value in values - merchant_keys.keys()]
    session.add_all(new_merchant_keys)
    session.flush()

    merchant_keys.update((merchant_key.value, merchant_key) for merchant_key in new_merchant_keys)
    return {value: merchant_key.id for value, merchant_key in merchant_keys.items()}


def _new_transaction(
    account_id: int, candidate: TransactionCandidate, merchant_key_ids: dict[str, int]
) -> Transaction:
    return Transaction(
        account_id=account_id,
        transaction_date=candidate.transaction_date,
        amount_minor=candidate.amount_minor,
        balance_after_minor=candidate.balance_after_minor,
        source_type=candidate.source_type,
        raw_description=candidate.raw_description,
        source_reference=candidate.source_reference,
        source_key=candidate.source_key,
        merchant_key_id=merchant_key_ids[normalize_merchant_key(candidate.raw_description)],
    )
