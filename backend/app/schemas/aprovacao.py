from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.aprovacao import StatusAprovacao
from app.models.postagem import TipoPostagem


class AprovacaoCreate(BaseModel):
    cliente_id: UUID
    tipo: TipoPostagem
    url_midia: str = Field(min_length=1, max_length=1024)
    legenda: str | None = Field(default=None, max_length=4000)
    data_agendada: datetime | None = None


class AprovacaoUpdate(BaseModel):
    tipo: TipoPostagem | None = None
    url_midia: str | None = Field(default=None, min_length=1, max_length=1024)
    legenda: str | None = Field(default=None, max_length=4000)
    data_agendada: datetime | None = None


class AprovacaoDecisao(BaseModel):
    comentario: str | None = Field(default=None, max_length=2000)


class AprovacaoOut(BaseModel):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    admin_nome: str | None = None
    tipo: TipoPostagem
    url_midia: str
    legenda: str | None
    data_agendada: datetime | None
    status: StatusAprovacao
    comentario_revisao: str | None
    decidido_em: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
