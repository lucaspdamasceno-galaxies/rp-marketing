from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models.usuario import Usuario


def autenticar(db: Session, email: str, senha: str) -> Usuario | None:
    usuario = db.scalar(select(Usuario).where(Usuario.email == email.lower()))
    if not usuario or not usuario.ativo:
        return None
    if not verify_password(senha, usuario.senha_hash):
        return None
    return usuario
