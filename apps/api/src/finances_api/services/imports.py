import hashlib
from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from finances_api.account_presets import PRESETS_BY_ID
from finances_api.counting import payer_mark
from finances_api.merchant_keys import normalize_merchant_key
from finances_api.models import (
    Account,
    AccountPresetId,
    CardType,
    CountsAs,
    ImportFile,
    ImportFileTransaction,
    MerchantKey,
    Transaction,
)
from finances_api.services.accounts import find_matching_accounts
from finances_api.services.payers import payer_rules
from finances_api.statements.ofx import (
    InvalidStatement,
    ParsedStatement,
    StatementError,
    StatementTransaction,
    parse_ofx,
)


@dataclass(frozen=True)
class NewAccount:
    preset: AccountPresetId
    name: str | None = None


@dataclass(frozen=True)
class ImportCompleted:
    import_id: int
    account_name: str
    new_transaction_count: int
    existing_transaction_count: int


@dataclass(frozen=True)
class DuplicateImport:
    pass


@dataclass(frozen=True)
class AccountSetupRequired:
    card_type: CardType


ImportResult = ImportCompleted | DuplicateImport | AccountSetupRequired | InvalidStatement


def import_statement(
    session: Session, filename: str, content: bytes, new_account: NewAccount | None = None
) -> ImportResult:
    statement = parse_ofx(content)
    if isinstance(statement, InvalidStatement):
        return statement

    match find_matching_accounts(session, statement.account):
        case [account]:
            pass
        case []:
            if new_account is None:
                return AccountSetupRequired(statement.account.card_type)
            account = _add_account(session, statement, new_account)
            if isinstance(account, InvalidStatement):
                return account
        case _:
            return _statement_error("This statement matches more than one saved account")
    return _import_into_account(session, account, filename, content, statement.transactions)


def _add_account(
    session: Session, statement: ParsedStatement, new_account: NewAccount
) -> Account | InvalidStatement:
    preset = PRESETS_BY_ID[new_account.preset]
    if preset.card_type != statement.account.card_type:
        return _statement_error(
            f"{preset.name} is a {preset.card_type} card, "
            f"but this is a {statement.account.card_type} card statement"
        )

    account = Account(
        name=(new_account.name or "").strip() or preset.name,
        institution=preset.institution,
        account_type=preset.account_type,
        preset=preset.id,
        acctid=statement.account.acctid,
        bankid=statement.account.bankid,
        org=statement.account.org,
        fid=statement.account.fid,
    )
    session.add(account)
    session.flush()
    return account


def _import_into_account(
    session: Session,
    account: Account,
    filename: str,
    content: bytes,
    statement_transactions: Sequence[StatementTransaction],
) -> ImportResult:
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

    completed = _record_transactions(session, account, import_file, statement_transactions)
    session.commit()
    return completed


def _record_transactions(
    session: Session,
    account: Account,
    import_file: ImportFile,
    statement_transactions: Sequence[StatementTransaction],
) -> ImportCompleted:
    existing_transactions = _existing_transactions(session, account.id, statement_transactions)
    new_statement_transactions = [
        transaction
        for transaction in statement_transactions
        if transaction.fitid not in existing_transactions
    ]
    merchant_key_ids = _merchant_key_ids_by_description(session, new_statement_transactions)
    rules = payer_rules(session, set(merchant_key_ids.values()))
    new_transactions = {
        transaction.fitid: _new_transaction(
            account.id,
            transaction,
            merchant_key_ids[transaction.raw_description],
            rules.get(merchant_key_ids[transaction.raw_description]),
        )
        for transaction in new_statement_transactions
    }
    session.add_all(new_transactions.values())
    session.flush()

    transactions = existing_transactions | new_transactions
    session.add_all(
        ImportFileTransaction(
            import_file_id=import_file.id,
            transaction_id=transactions[transaction.fitid].id,
            position=transaction.position,
        )
        for transaction in statement_transactions
    )
    return ImportCompleted(
        import_id=import_file.id,
        account_name=account.name,
        new_transaction_count=len(new_transactions),
        existing_transaction_count=len(existing_transactions),
    )


def _existing_transactions(
    session: Session, account_id: int, statement_transactions: Sequence[StatementTransaction]
) -> dict[str, Transaction]:
    fitids = [transaction.fitid for transaction in statement_transactions]
    transactions = session.scalars(
        select(Transaction).where(
            Transaction.account_id == account_id, Transaction.fitid.in_(fitids)
        )
    )
    return {transaction.fitid: transaction for transaction in transactions}


def _merchant_key_ids_by_description(
    session: Session, statement_transactions: Sequence[StatementTransaction]
) -> dict[str, int]:
    values_by_description = {
        transaction.raw_description: normalize_merchant_key(transaction.raw_description)
        for transaction in statement_transactions
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
    account_id: int,
    statement_transaction: StatementTransaction,
    merchant_key_id: int,
    rule: CountsAs | None,
) -> Transaction:
    mark = payer_mark(rule, statement_transaction.amount_minor)
    return Transaction(
        account_id=account_id,
        transaction_date=statement_transaction.transaction_date,
        amount_minor=statement_transaction.amount_minor,
        source_type=statement_transaction.source_type,
        raw_description=statement_transaction.raw_description,
        memo=statement_transaction.memo,
        fitid=statement_transaction.fitid,
        merchant_key_id=merchant_key_id,
        counts_as=mark,
        counts_as_source="payer" if mark else None,
    )


def _statement_error(message: str) -> InvalidStatement:
    return InvalidStatement((StatementError(None, message),))
