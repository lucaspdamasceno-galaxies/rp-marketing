from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RelatorioTrafegoUpdate(BaseModel):
    periodo_inicio: date | None = None
    periodo_fim: date | None = None
    dados: dict[str, Any] | None = None
    observacoes: str | None = Field(default=None, max_length=4000)


class RelatorioTrafegoOut(BaseModel):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    admin_nome: str | None = None
    periodo_inicio: date
    periodo_fim: date
    pdf_url: str | None = None
    pdf_nome_original: str | None = None
    dados: dict[str, Any]
    observacoes: str | None
    created_at: datetime
    updated_at: datetime


class RelatorioTrafegoComparacaoItem(BaseModel):
    """Resumo cronológico para gráficos de evolução."""

    id: UUID
    periodo_inicio: date
    periodo_fim: date
    google_custo: float | None = None
    google_impressoes: int | None = None
    google_cliques: int | None = None
    google_ctr: float | None = None
    google_cpc: float | None = None
    meta_investido: float | None = None
    meta_alcance: int | None = None
    meta_impressoes: int | None = None
    meta_cliques_link: int | None = None
    meta_ctr_link: float | None = None
    meta_cpc: float | None = None
    meta_conversas: int | None = None


class RelatorioTrafegoDiff(BaseModel):
    anterior: RelatorioTrafegoComparacaoItem
    atual: RelatorioTrafegoComparacaoItem
    deltas: dict[str, float | int | None]
