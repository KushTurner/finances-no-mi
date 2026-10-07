from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from finances_api.categories import CATEGORY_DEFINITIONS
from finances_api.models import Category


def list_categories(session: Session) -> Sequence[Category]:
    categories = session.scalars(
        select(Category).where(Category.name.in_(CATEGORY_DEFINITIONS), Category.definition != "")
    ).all()
    order = {name: index for index, name in enumerate(CATEGORY_DEFINITIONS)}
    return sorted(categories, key=lambda category: order[category.name])
