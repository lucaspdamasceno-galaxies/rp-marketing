from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_token,
    hash_password,
)
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginIn,
    LoginOut,
    MeOut,
    RecuperarSenhaIn,
    RedefinirSenhaIn,
    UsuarioOut,
)
from app.schemas.common import Envelope
from app.services.auth_service import autenticar

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Envelope[LoginOut])
def login(payload: LoginIn, db: DbSession) -> Envelope[LoginOut]:
    usuario = autenticar(db, payload.email, payload.senha)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="email ou senha inválidos",
        )

    token = create_access_token(usuario.id, usuario.role.value)
    return Envelope(
        data=LoginOut(access_token=token, usuario=UsuarioOut.model_validate(usuario))
    )


@router.post("/recuperar-senha", response_model=Envelope[None])
def recuperar_senha(payload: RecuperarSenhaIn, db: DbSession) -> Envelope[None]:
    usuario = db.scalar(select(Usuario).where(Usuario.email == payload.email.lower()))
    # Sempre retorna sucesso para não revelar existência de email
    if usuario and usuario.ativo:
        # TODO: enviar email com link contendo token
        _ = create_password_reset_token(usuario.id)
    return Envelope(message="se o email existir, instruções foram enviadas")


@router.post("/redefinir-senha", response_model=Envelope[None])
def redefinir_senha(payload: RedefinirSenhaIn, db: DbSession) -> Envelope[None]:
    try:
        data = decode_token(payload.token)
    except ValueError:
        raise HTTPException(status_code=400, detail="token inválido ou expirado")

    if data.get("type") != "password_reset":
        raise HTTPException(status_code=400, detail="token inválido")

    sub = data.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="token inválido")

    try:
        user_id = UUID(sub)
    except ValueError:
        raise HTTPException(status_code=400, detail="token inválido")

    usuario = db.get(Usuario, user_id)
    if not usuario or not usuario.ativo:
        raise HTTPException(status_code=400, detail="token inválido")

    usuario.senha_hash = hash_password(payload.nova_senha)
    db.commit()
    return Envelope(message="senha redefinida")


@router.get("/me", response_model=Envelope[MeOut])
def me(current: CurrentUser, db: DbSession) -> Envelope[MeOut]:
    cliente_id = None
    if current.role.value == "cliente":
        cliente = db.scalar(select(Cliente).where(Cliente.usuario_id == current.id))
        cliente_id = cliente.id if cliente else None

    return Envelope(
        data=MeOut(
            id=current.id,
            nome=current.nome,
            email=current.email,
            role=current.role,
            cliente_id=cliente_id,
        )
    )
