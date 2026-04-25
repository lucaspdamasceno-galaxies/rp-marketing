from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.usuario import RoleUsuario


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1)


class UsuarioOut(BaseModel):
    id: UUID
    nome: str
    email: EmailStr
    role: RoleUsuario

    model_config = {"from_attributes": True}


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class RecuperarSenhaIn(BaseModel):
    email: EmailStr


class RedefinirSenhaIn(BaseModel):
    token: str
    nova_senha: str = Field(min_length=8, max_length=128)


class MeOut(UsuarioOut):
    cliente_id: UUID | None = None
