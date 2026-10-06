from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BeforeValidator, Field
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.services import summary


def first_day_of_month(value: str) -> date:
    return datetime.strptime(value, "%Y-%m").date()


Month = Annotated[date, BeforeValidator(first_day_of_month)]
AccountIds = Annotated[
    list[Annotated[int, Field(gt=0)]], Query(alias="account_id", default_factory=list)
]

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("")
def get_summary(
    session: Annotated[Session, Depends(get_session)],
    start: Annotated[date, Query(alias="from")],
    end: Annotated[date, Query(alias="to")],
    account_ids: AccountIds,
) -> summary.Summary:
    result = summary.summarize(session, start, end, account_ids)
    if isinstance(result, summary.InvalidSummaryRequest):
        raise HTTPException(status_code=400, detail=result.message)
    return result


@router.get("/months")
def get_monthly_summary(
    session: Annotated[Session, Depends(get_session)],
    first_month: Annotated[Month, Query(alias="from")],
    last_month: Annotated[Month, Query(alias="to")],
    account_ids: AccountIds,
) -> summary.MonthlySummary:
    result = summary.summarize_months(session, first_month, last_month, account_ids)
    if isinstance(result, summary.InvalidSummaryRequest):
        raise HTTPException(status_code=400, detail=result.message)
    return result


@router.get("/days")
def get_daily_summary(
    session: Annotated[Session, Depends(get_session)],
    start: Annotated[date, Query(alias="from")],
    end: Annotated[date, Query(alias="to")],
    account_ids: AccountIds,
) -> list[summary.DayTotals]:
    result = summary.summarize_days(session, start, end, account_ids)
    if isinstance(result, summary.InvalidSummaryRequest):
        raise HTTPException(status_code=400, detail=result.message)
    return result
