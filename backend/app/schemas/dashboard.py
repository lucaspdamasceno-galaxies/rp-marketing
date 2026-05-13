from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.postagem import PostagemOut


class DashboardResumo(BaseModel):
    followers: int
    total_curtidas: int
    total_comentarios: int
    total_alcance: int
    total_postagens: int


class DeltaMetrica(BaseModel):
    absoluto: int
    percentual: float


class PontoCrescimento(BaseModel):
    data: date
    followers: int


class CampoCustomizadoOut(BaseModel):
    chave: str
    label: str
    valor: float
    sufixo: str | None = None


class DashboardOut(BaseModel):
    resumo: DashboardResumo
    deltas: dict[str, DeltaMetrica] = {}
    crescimento: list[PontoCrescimento]
    ultimas_postagens: list[PostagemOut]
    last_sync_at: datetime | None = None
    campos_customizados: list[CampoCustomizadoOut] = []
    fonte: Literal["auto", "manual"] = "auto"
