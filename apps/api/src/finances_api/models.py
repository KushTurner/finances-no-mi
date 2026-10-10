from datetime import date, datetime
from typing import Literal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
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


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    definition: Mapped[str] = mapped_column(Text, server_default="")


class Merchant(Base):
    __tablename__ = "merchants"
    __table_args__ = (Index("ix_merchants_category_id", "category_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"))


class MerchantKey(Base):
    __tablename__ = "merchant_keys"
    __table_args__ = (Index("ix_merchant_keys_merchant_id", "merchant_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[str] = mapped_column(String, unique=True)
    merchant_id: Mapped[int | None] = mapped_column(ForeignKey("merchants.id", ondelete="RESTRICT"))


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("account_id", "fitid", name="uq_transactions_fitid"),
        Index("ix_transactions_account_date", "account_id", "transaction_date"),
        Index("ix_transactions_merchant_key_id", "merchant_key_id"),
        Index("ix_transactions_category_id", "category_id"),
        CheckConstraint(
            "(category_id IS NULL AND category_decision_source IS NULL "
            "AND category_decided_at IS NULL) OR "
            "(category_id IS NOT NULL AND category_decision_source IS NOT NULL "
            "AND category_decided_at IS NOT NULL)",
            name="ck_transactions_category_decision",
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

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT")
    )
    category_decision_source: Mapped[str | None] = mapped_column(String)
    category_decided_at: Mapped[datetime | None] = mapped_column(DateTime)


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


class MerchantSuggestion(Base):
    __tablename__ = "merchant_suggestions"
    __table_args__ = (
        CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_merchant_suggestions_confidence",
        ),
    )

    merchant_key_id: Mapped[int] = mapped_column(
        ForeignKey("merchant_keys.id", ondelete="CASCADE"), primary_key=True
    )
    suggested_merchant_name: Mapped[str] = mapped_column(String)
    suggested_category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT")
    )
    confidence: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
