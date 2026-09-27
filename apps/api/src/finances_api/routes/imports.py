from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.services.imports import (
    AccountNotFound,
    DuplicateImport,
    ImportCompleted,
    SeveralInstitutionAccounts,
    import_detected_statement,
    import_statement,
)
from finances_api.statements.contract import InvalidStatement


class ImportResponse(BaseModel):
    import_id: int
    account_name: str
    new_transaction_count: int
    existing_transaction_count: int


class StatementError(BaseModel):
    row_number: int | None
    message: str


class StatementErrorsResponse(BaseModel):
    errors: list[StatementError]


router = APIRouter(prefix="/accounts/{account_id}/imports", tags=["imports"])
detected_router = APIRouter(prefix="/imports", tags=["imports"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ImportResponse,
    responses={status.HTTP_400_BAD_REQUEST: {"model": StatementErrorsResponse}},
)
def create_import(
    account_id: int, file: UploadFile, session: Annotated[Session, Depends(get_session)]
) -> ImportResponse | JSONResponse:
    result = import_statement(session, account_id, file.filename or "", file.file.read())

    match result:
        case ImportCompleted():
            return ImportResponse.model_validate(result, from_attributes=True)
        case AccountNotFound():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
        case DuplicateImport():
            raise HTTPException(status.HTTP_409_CONFLICT, "This file has already been imported")
        case InvalidStatement():
            return _statement_errors_response(result)


@detected_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ImportResponse,
    responses={status.HTTP_400_BAD_REQUEST: {"model": StatementErrorsResponse}},
)
def create_detected_import(
    file: UploadFile, session: Annotated[Session, Depends(get_session)]
) -> ImportResponse | JSONResponse:
    result = import_detected_statement(session, file.filename or "", file.file.read())

    match result:
        case ImportCompleted():
            return ImportResponse.model_validate(result, from_attributes=True)
        case DuplicateImport():
            raise HTTPException(status.HTTP_409_CONFLICT, "This file has already been imported")
        case SeveralInstitutionAccounts():
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Several accounts exist for this statement's institution",
            )
        case InvalidStatement():
            return _statement_errors_response(result)


def _statement_errors_response(statement: InvalidStatement) -> JSONResponse:
    errors = StatementErrorsResponse(
        errors=[
            StatementError(row_number=error.row_number, message=error.message)
            for error in statement.errors
        ]
    )
    return JSONResponse(errors.model_dump(), status_code=status.HTTP_400_BAD_REQUEST)
