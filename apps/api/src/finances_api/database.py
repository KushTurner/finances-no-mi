import os
from collections.abc import Iterator
from pathlib import Path
from sqlite3 import Connection as SQLiteConnection

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DATA_DIRECTORY = PROJECT_ROOT / ".data"
DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DATA_DIRECTORY / 'finances.db'}"


def get_database_url() -> str:
    return os.environ.get("FINANCES_DATABASE_URL", DEFAULT_DATABASE_URL)


def create_database_engine(database_url: str | None = None) -> Engine:
    url = database_url or get_database_url()
    if url.startswith("sqlite:///"):
        database_path = Path(url.removeprefix("sqlite:///"))
        database_path.parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(url)

    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection: SQLiteConnection, _: object) -> None:
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = create_database_engine()


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
