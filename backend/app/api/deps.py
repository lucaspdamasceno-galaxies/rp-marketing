from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.usuario import RoleUsuario, Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=True)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Usuario:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise cred_exc

    if payload.get("type") != "access":
        raise cred_exc

    sub = payload.get("sub")
    if not sub:
        raise cred_exc

    try:
        user_id = UUID(sub)
    except ValueError:
        raise cred_exc

    user = db.get(Usuario, user_id)
    if not user or not user.ativo:
        raise cred_exc
    return user


def require_admin(current_user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
    if current_user.role != RoleUsuario.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="apenas administradores",
        )
    return current_user


def require_cliente(current_user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
    if current_user.role != RoleUsuario.cliente:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="apenas clientes",
        )
    return current_user


CurrentUser = Annotated[Usuario, Depends(get_current_user)]
AdminUser = Annotated[Usuario, Depends(require_admin)]
ClienteUser = Annotated[Usuario, Depends(require_cliente)]
DbSession = Annotated[Session, Depends(get_db)]
