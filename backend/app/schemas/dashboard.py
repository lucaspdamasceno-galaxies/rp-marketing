from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.postagem import PostagemOut


class DashboardResumo(BaseModel):
    followers: int
    total_curtidas: int
    total_comentarios: int
    total_alcance: int
    total_postagens: int


class PontoCrescimento(BaseModel):
    data: date
    followers: int


class DashboardOut(BaseModel):
    resumo: DashboardResumo
    crescimento: list[PontoCrescimento]
    ultimas_postagens: list[PostagemOut]
    last_sync_at: datetime | None = None
