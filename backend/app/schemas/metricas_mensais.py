from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class CampoCustomizado(BaseModel):
    chave: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=128)
    valor: float
    sufixo: str | None = Field(default=None, max_length=16)


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
    campos_customizados: list[CampoCustomizado] = Field(default_factory=list)


class MetricasMensaisCreate(MetricasMensaisBase):
    cliente_id: UUID
    data_inicio: date
    data_fim: date

    @model_validator(mode="after")
    def _valida_periodo(self) -> "MetricasMensaisCreate":
        if self.data_fim < self.data_inicio:
            raise ValueError("data_fim deve ser maior ou igual a data_inicio")
        return self


class MetricasMensaisUpdate(MetricasMensaisBase):
    data_inicio: date | None = None
    data_fim: date | None = None

    @model_validator(mode="after")
    def _valida_periodo(self) -> "MetricasMensaisUpdate":
        if (
            self.data_inicio
            and self.data_fim
            and self.data_fim < self.data_inicio
        ):
            raise ValueError("data_fim deve ser maior ou igual a data_inicio")
        return self


class MetricasMensaisOut(MetricasMensaisBase):
    id: UUID
    cliente_id: UUID
    cliente_nome_empresa: str | None = None
    admin_id: UUID
    data_inicio: date
    data_fim: date
    created_at: datetime
    updated_at: datetime
