from fastapi import APIRouter, UploadFile
from pydantic import BaseModel

from finances_api.models import Institution
from finances_api.statements.parsers import detect_institution


class InstitutionDetectionResponse(BaseModel):
    institution: Institution | None


router = APIRouter(prefix="/statements", tags=["statements"])


@router.post("/institution")
def detect_statement_institution(file: UploadFile) -> InstitutionDetectionResponse:
    return InstitutionDetectionResponse(institution=detect_institution(file.file.read()))
