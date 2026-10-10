from datetime import date, datetime
from typing import Literal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

Institution = Literal["amex", "natwest", "nationwide"]
AccountType = Literal["current_account", "credit_card", "savings"]
AccountPresetId = Literal["amex_gold", "nationwide_flexone", "natwest_select"]
CardType = Literal["credit", "debit"]
CountsAs = Literal["income", "repayment", "own_account"]
CountsAsSource = Literal["payer", "human"]

COUNTS_AS_VALUES = "('income', 'repayment', 'own_account')"


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (Index("ix_accounts_acctid", "acctid"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String)
    institution: Mapped[Institution] = mapped_column(String)
    account_type: Mapped[AccountType] = mapped_column(String)
    preset: Mapped[AccountPresetId] = mapped_column(String)
    acctid: Mapped[str] = mapped_column(String)
    bankid: Mapped[str | None] = mapped_column(String)
    org: Mapped[str | None] = mapped_column(String)
    fid: Mapped[str | None] = mapped_column(String)


class ImportFile(Base):
    __tablename__ = "import_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    original_filename: Mapped[str] = mapped_column(String)
    content_sha256: Mapped[str] = mapped_column(String(64), unique=True)
    content: Mapped[bytes] = mapped_column(LargeBinary)
    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())


class MerchantKey(Base):
    __tablename__ = "merchant_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[str] = mapped_column(String, unique=True)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("account_id", "fitid", name="uq_transactions_fitid"),
        Index("ix_transactions_account_date", "account_id", "transaction_date"),
        Index("ix_transactions_merchant_key_id", "merchant_key_id"),
        CheckConstraint(
            f"counts_as IS NULL OR counts_as IN {COUNTS_AS_VALUES}",
            name="ck_transactions_counts_as",
        ),
        CheckConstraint(
            "counts_as NOT IN ('income', 'repayment') OR amount_minor > 0",
            name="ck_transactions_counts_as_incoming",
        ),
        CheckConstraint(
            "(counts_as IS NULL AND counts_as_source IS NULL) OR "
            "(counts_as IS NOT NULL AND counts_as_source IN ('payer', 'human'))",
            name="ck_transactions_counts_as_source",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    transaction_date: Mapped[date] = mapped_column(Date)
    amount_minor: Mapped[int] = mapped_column(Integer)
    source_type: Mapped[str | None] = mapped_column(String)
    raw_description: Mapped[str] = mapped_column(Text)
    memo: Mapped[str | None] = mapped_column(Text)
    fitid: Mapped[str] = mapped_column(String)
    merchant_key_id: Mapped[int] = mapped_column(
        ForeignKey("merchant_keys.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    counts_as: Mapped[CountsAs | None] = mapped_column(String)
    counts_as_source: Mapped[CountsAsSource | None] = mapped_column(String)


class PayerRule(Base):
    __tablename__ = "payer_rules"
    __table_args__ = (
        CheckConstraint(f"counts_as IN {COUNTS_AS_VALUES}", name="ck_payer_rules_counts_as"),
    )

    merchant_key_id: Mapped[int] = mapped_column(
        ForeignKey("merchant_keys.id", ondelete="RESTRICT"), primary_key=True
    )
    counts_as: Mapped[CountsAs] = mapped_column(String)


class ImportFileTransaction(Base):
    __tablename__ = "import_file_transactions"
    __table_args__ = (
        UniqueConstraint(
            "import_file_id",
            "transaction_id",
            name="uq_import_file_transactions_transaction",
        ),
        CheckConstraint("position > 0", name="ck_import_file_transactions_position"),
        Index("ix_import_file_transactions_transaction_id", "transaction_id"),
    )

    import_file_id: Mapped[int] = mapped_column(
        ForeignKey("import_files.id", ondelete="RESTRICT"), primary_key=True
    )
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id", ondelete="RESTRICT"))
    position: Mapped[int] = mapped_column(Integer, primary_key=True)
