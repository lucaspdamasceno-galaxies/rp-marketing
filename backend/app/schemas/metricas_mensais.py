import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ANO_MES_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class MetricasMensaisBase(BaseModel):
    seguidores: int = Field(default=0, ge=0)
    seguidores_ganhos: int = Field(default=0, ge=0)
    seguidores_perdidos: int = Field(default=0, ge=0)
    alcance: int = Field(default=0, ge=0)
    impressoes: int = Field(default=0, ge=0)
    visualizacoes: int = Field(default=0, ge=0)
    curtidas: int = Field(default=0, ge=0)
    comentarios: int = Field(default=0, ge=0)
    compartilhamentos: int = Field(default=0, ge=0)
    salvamentos: int = Field(default=0, ge=0)
    visitas_perfil: int = Field(default=0, ge=0)
    cliques_site: int = Field(default=0, ge=0)
    total_postagens: int = Field(default=0, ge=0)
    total_stories: int = Field(default=0, ge=0)
    total_reels: int = Field(default=0, ge=0)
    observacoes: str | None = Field(default=None, max_length=4000)


class MetricasMensaisCreate(MetricasMensaisBase):
    cliente_id: UUID
    ano_mes: str = Field(..., description="Formato YYYY-MM, ex.: 2026-04")

    @field_validator("ano_mes")
    @classmethod
    def _valida_ano_mes(cls, v: str) -> str:
        if not ANO_MES_RE.match(v):
            raise ValueError("ano_mes deve estar no formato YYYY-MM")
        return v


class MetricasMensaisUpdate(MetricasMensaisBase):
    pass


class MetricasMensaisOut(MetricasMensaisBase):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    ano_mes: str
    created_at: datetime
    updated_at: datetime
