from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.services import categories


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    definition: str


router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
def list_categories(session: Annotated[Session, Depends(get_session)]) -> list[CategoryResponse]:
    return [
        CategoryResponse.model_validate(category)
        for category in categories.list_categories(session)
    ]
