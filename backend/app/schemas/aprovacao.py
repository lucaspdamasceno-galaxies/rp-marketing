from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.aprovacao import StatusAprovacao
from app.models.postagem import TipoPostagem


class AprovacaoMidiaOut(BaseModel):
    id: UUID
    ordem: int
    url: str
    mime_type: str
    tamanho_bytes: int
    nome_original: str
    created_at: datetime


class AprovacaoComentarioCreate(BaseModel):
    mensagem: str = Field(min_length=1, max_length=4000)


class AprovacaoComentarioOut(BaseModel):
    id: UUID
    aprovacao_id: UUID
    autor_id: UUID
    autor_nome: str | None = None
    autor_role: str | None = None
    mensagem: str
    anexos_urls: list[str] = []
    created_at: datetime


class AprovacaoCreate(BaseModel):
    cliente_id: UUID
    titulo: str = Field(min_length=1, max_length=255)
    tipo: TipoPostagem
    legenda: str | None = Field(default=None, max_length=8000)
    data_agendada: datetime | None = None


class AprovacaoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=255)
    tipo: TipoPostagem | None = None
    legenda: str | None = Field(default=None, max_length=8000)
    data_agendada: datetime | None = None


class AprovacaoDecisao(BaseModel):
    """Cliente aprova ou rejeita um trilho (texto ou arte). Comentário opcional para aprovar, obrigatório pra rejeitar."""

    comentario: str | None = Field(default=None, max_length=4000)


class AprovacaoStatusAdmin(BaseModel):
    """Override administrativo dos trilhos. Útil quando admin precisa
    corrigir/forçar um status sem envolver o cliente.
    """

    status_texto: StatusAprovacao | None = None
    status_arte: StatusAprovacao | None = None


class AprovacaoOut(BaseModel):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    admin_nome: str | None = None

    titulo: str
    tipo: TipoPostagem
    legenda: str | None
    data_agendada: datetime | None

    status_texto: StatusAprovacao
    status_arte: StatusAprovacao
    decidido_texto_em: datetime | None
    decidido_arte_em: datetime | None
    postado_em: datetime | None

    midias: list[AprovacaoMidiaOut] = []
    total_comentarios: int = 0

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AprovacaoDetail(AprovacaoOut):
    comentarios: list[AprovacaoComentarioOut] = []
