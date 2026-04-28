from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.contrato import StatusContrato


class ContratoCreate(BaseModel):
    cliente_id: UUID
    titulo: str = Field(min_length=1, max_length=255)
    escopo: list[str] = Field(default_factory=list, max_length=20)
    descricao: str | None = Field(default=None, max_length=20000)
    valor_mensal: Decimal | None = Field(default=None, ge=0)
    duracao_meses: int = Field(..., ge=1, le=120)
    data_inicio: date


class ContratoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=255)
    escopo: list[str] | None = Field(default=None, max_length=20)
    descricao: str | None = Field(default=None, max_length=20000)
    valor_mensal: Decimal | None = Field(default=None, ge=0)
    duracao_meses: int | None = Field(default=None, ge=1, le=120)
    data_inicio: date | None = None


class ContratoAtivar(BaseModel):
    """Admin marca o contrato como ativo após o cliente assinar externamente."""

    assinado_em_externo: date | None = None


class ContratoCancelar(BaseModel):
    motivo: str | None = Field(default=None, max_length=1000)


class ContratoOut(BaseModel):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    admin_nome: str | None = None

    titulo: str
    escopo: list[str]
    descricao: str | None
    valor_mensal: Decimal | None
    duracao_meses: int
    data_inicio: date
    data_fim: date
    status: StatusContrato

    pdf_url: str | None = None
    pdf_nome_original: str | None = None
    assinado_em_externo: date | None

    cancelado_em: datetime | None
    motivo_cancelamento: str | None

    created_at: datetime
    updated_at: datetime
