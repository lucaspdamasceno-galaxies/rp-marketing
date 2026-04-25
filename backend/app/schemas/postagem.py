from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.postagem import TipoPostagem


class PostagemOut(BaseModel):
    id: UUID
    cliente_id: UUID
    instagram_media_id: str
    tipo: TipoPostagem
    url_midia: str
    permalink: str | None = None
    legenda: str | None = None
    curtidas: int
    comentarios: int
    visualizacoes: int
    alcance: int
    impressoes: int
    data_publicacao: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
