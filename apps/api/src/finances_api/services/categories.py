from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.models import Category


def list_categories(session: Session) -> Sequence[Category]:
    return session.scalars(
        select(Category).where(Category.definition != "").order_by(Category.id)
    ).all()
