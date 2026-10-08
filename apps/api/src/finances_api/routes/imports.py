from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.models import AccountPresetId, AccountType
from finances_api.services.imports import (
    AccountSetupRequired,
    DuplicateImport,
    ImportCompleted,
    NewAccount,
    import_statement,
)
from finances_api.statements.ofx import InvalidStatement


class ImportResponse(BaseModel):
    import_id: int
    account_name: str
    new_transaction_count: int
    existing_transaction_count: int


class StatementError(BaseModel):
    position: int | None
    message: str


class StatementErrorsResponse(BaseModel):
    errors: list[StatementError]


class AccountSetupRequiredResponse(BaseModel):
    detail: str
    account_type: AccountType | None


router = APIRouter(prefix="/imports", tags=["imports"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ImportResponse,
    responses={
        status.HTTP_400_BAD_REQUEST: {"model": StatementErrorsResponse},
        status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": AccountSetupRequiredResponse},
    },
)
def create_import(
    file: UploadFile,
    session: Annotated[Session, Depends(get_session)],
    preset: Annotated[AccountPresetId | None, Form()] = None,
    name: Annotated[str | None, Form()] = None,
) -> ImportResponse | JSONResponse:
    new_account = NewAccount(preset, name) if preset is not None else None
    result = import_statement(session, file.filename or "", file.file.read(), new_account)

    match result:
        case ImportCompleted():
            return ImportResponse.model_validate(result, from_attributes=True)
        case DuplicateImport():
            raise HTTPException(status.HTTP_409_CONFLICT, "This file has already been imported")
        case AccountSetupRequired():
            return _account_setup_required_response(result)
        case InvalidStatement():
            return _statement_errors_response(result)


def _account_setup_required_response(result: AccountSetupRequired) -> JSONResponse:
    body = AccountSetupRequiredResponse(
        detail="Add an account for this statement", account_type=result.account_type
    )
    return JSONResponse(body.model_dump(), status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)


def _statement_errors_response(statement: InvalidStatement) -> JSONResponse:
    errors = StatementErrorsResponse(
        errors=[
            StatementError(position=error.position, message=error.message)
            for error in statement.errors
        ]
    )
    return JSONResponse(errors.model_dump(), status_code=status.HTTP_400_BAD_REQUEST)
