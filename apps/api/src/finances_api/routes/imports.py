from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from finances_api.database import get_session
from finances_api.imports import DuplicateImport, ImportCompleted, import_statement
from finances_api.models import Account
from finances_api.statements.contract import InvalidStatement


class ImportResponse(BaseModel):
    import_id: int
    new_transaction_count: int
    existing_transaction_count: int


class StatementError(BaseModel):
    row_number: int | None
    message: str


class StatementErrorsResponse(BaseModel):
    errors: list[StatementError]


router = APIRouter(prefix="/accounts/{account_id}/imports", tags=["imports"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ImportResponse,
    responses={status.HTTP_422_UNPROCESSABLE_CONTENT: {"model": StatementErrorsResponse}},
)
def create_import(
    account_id: int, file: UploadFile, session: Annotated[Session, Depends(get_session)]
) -> ImportResponse | JSONResponse:
    account = session.get(Account, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    result = import_statement(session, account, file.filename or "", file.file.read())

    match result:
        case ImportCompleted():
            return ImportResponse(
                import_id=result.import_id,
                new_transaction_count=result.new_transaction_count,
                existing_transaction_count=result.existing_transaction_count,
            )
        case DuplicateImport():
            raise HTTPException(status.HTTP_409_CONFLICT, "This file has already been imported")
        case InvalidStatement():
            return _statement_errors_response(result)


def _statement_errors_response(statement: InvalidStatement) -> JSONResponse:
    errors = StatementErrorsResponse(
        errors=[
            StatementError(row_number=error.row_number, message=error.message)
            for error in statement.errors
        ]
    )
    return JSONResponse(errors.model_dump(), status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)
