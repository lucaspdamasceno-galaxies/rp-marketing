from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, clientes, dashboard, instagram, postagens
from app.core.config import settings

app = FastAPI(
    title="RP Marketing API",
    version="0.1.0",
    description="API REST do painel da RP Marketing",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exc_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "erro"
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "message": detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    msg = "dados inválidos"
    if errors:
        first = errors[0]
        loc = ".".join(str(x) for x in first.get("loc", []) if x != "body")
        msg = f"{loc}: {first.get('msg')}" if loc else first.get("msg", msg)
    return JSONResponse(
        status_code=422,
        content={"success": False, "data": None, "message": msg},
    )


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"success": True, "data": {"status": "ok"}, "message": None}


api = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api)
app.include_router(dashboard.router, prefix=api)
app.include_router(postagens.router, prefix=api)
app.include_router(clientes.router, prefix=api)
app.include_router(instagram.router, prefix=api)
