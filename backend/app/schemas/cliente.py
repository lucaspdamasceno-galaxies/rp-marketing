from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ClienteCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=255)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    nome_empresa: str = Field(min_length=1, max_length=255)


class ClienteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    senha: str | None = Field(default=None, min_length=8, max_length=128)
    nome_empresa: str | None = Field(default=None, min_length=1, max_length=255)
    ativo: bool | None = None


class ClienteOut(BaseModel):
    id: UUID
    usuario_id: UUID
    nome: str
    email: EmailStr
    ativo: bool
    nome_empresa: str
    instagram_account_id: str | None = None
    instagram_conectado: bool = False
    token_expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
