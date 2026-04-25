"""Cria um usuário admin inicial.

Uso:
    python -m app.scripts.seed_admin <email> <senha> "Nome Admin"
"""
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.usuario import RoleUsuario, Usuario


def main(email: str, senha: str, nome: str) -> None:
    with SessionLocal() as db:
        existente = db.scalar(select(Usuario).where(Usuario.email == email.lower()))
        if existente:
            print(f"já existe usuário com email {email}; nada feito")
            return
        usuario = Usuario(
            nome=nome,
            email=email.lower(),
            senha_hash=hash_password(senha),
            role=RoleUsuario.admin,
            ativo=True,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        print(f"admin criado: id={usuario.id} email={usuario.email}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
