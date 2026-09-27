from fastapi import FastAPI
from pydantic import BaseModel

from finances_api.routes import accounts, categories, imports, transactions


class HealthResponse(BaseModel):
    status: str


app = FastAPI(title="Finances No MI")
app.include_router(accounts.router)
app.include_router(imports.router)
app.include_router(categories.router)
app.include_router(transactions.router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
