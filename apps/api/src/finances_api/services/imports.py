import hashlib
from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from finances_api.merchant_keys import normalize_merchant_key
from finances_api.models import (
    Account,
    ImportFile,
    ImportFileTransaction,
    MerchantKey,
    Transaction,
)
from finances_api.statements.contract import InvalidStatement, TransactionCandidate
from finances_api.statements.parsers import PARSERS_BY_INSTITUTION


@dataclass(frozen=True)
class ImportCompleted:
    import_id: int
    new_transaction_count: int
    existing_transaction_count: int


@dataclass(frozen=True)
class AccountNotFound:
    pass


@dataclass(frozen=True)
class DuplicateImport:
    pass


ImportResult = ImportCompleted | AccountNotFound | DuplicateImport | InvalidStatement


def import_statement(
    session: Session, account_id: int, filename: str, content: bytes
) -> ImportResult:
    account = session.get(Account, account_id)
    if account is None:
        return AccountNotFound()

    result = PARSERS_BY_INSTITUTION[account.institution](content)
    if isinstance(result, InvalidStatement):
        return result

    import_file = ImportFile(
        account_id=account.id,
        original_filename=filename,
        content_sha256=hashlib.sha256(content).hexdigest(),
        content=content,
    )
    session.add(import_file)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        return DuplicateImport()

    completed = _record_transactions(session, import_file, result.candidates)
    session.commit()
    return completed


def _record_transactions(
    session: Session, import_file: ImportFile, candidates: Sequence[TransactionCandidate]
) -> ImportCompleted:
    existing_transactions = _existing_transactions(session, import_file.account_id, candidates)
    new_candidates = [
        candidate for candidate in candidates if candidate.source_key not in existing_transactions
    ]
    merchant_key_ids = _merchant_key_ids_by_description(session, new_candidates)
    new_transactions = {
        candidate.source_key: _new_transaction(
            import_file.account_id, candidate, merchant_key_ids[candidate.raw_description]
        )
        for candidate in new_candidates
    }
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
    return ImportCompleted(
        import_id=import_file.id,
        new_transaction_count=len(new_transactions),
        existing_transaction_count=len(existing_transactions),
    )


def _existing_transactions(
    session: Session, account_id: int, candidates: Sequence[TransactionCandidate]
) -> dict[str, Transaction]:
    source_keys = [candidate.source_key for candidate in candidates]
    transactions = session.scalars(
        select(Transaction).where(
            Transaction.account_id == account_id, Transaction.source_key.in_(source_keys)
        )
    )
    return {transaction.source_key: transaction for transaction in transactions}


def _merchant_key_ids_by_description(
    session: Session, candidates: Sequence[TransactionCandidate]
) -> dict[str, int]:
    values_by_description = {
        candidate.raw_description: normalize_merchant_key(candidate.raw_description)
        for candidate in candidates
    }
    if not values_by_description:
        return {}

    values = set(values_by_description.values())
    session.execute(
        insert(MerchantKey).values([{"value": value} for value in values]).on_conflict_do_nothing()
    )
    ids_by_value = dict(
        session.execute(
            select(MerchantKey.value, MerchantKey.id).where(MerchantKey.value.in_(values))
        ).all()
    )
    return {
        description: ids_by_value[value] for description, value in values_by_description.items()
    }


def _new_transaction(
    account_id: int, candidate: TransactionCandidate, merchant_key_id: int
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
        merchant_key_id=merchant_key_id,
    )
