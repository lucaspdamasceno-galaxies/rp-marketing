from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.cliente import Cliente
from app.models.usuario import RoleUsuario, Usuario
from app.schemas.cliente import ClienteCreate, ClienteUpdate


def listar(
    db: Session, q: str | None, page: int, page_size: int
) -> tuple[list[Cliente], int]:
    base = select(Cliente).join(Usuario)
    if q:
        like = f"%{q}%"
        base = base.where(
            or_(
                Usuario.nome.ilike(like),
                Usuario.email.ilike(like),
                Cliente.nome_empresa.ilike(like),
            )
        )

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    stmt = (
        base.options(joinedload(Cliente.usuario))
        .order_by(Cliente.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return list(items), total


def buscar(db: Session, cliente_id: UUID) -> Cliente | None:
    stmt = (
        select(Cliente)
        .options(joinedload(Cliente.usuario))
        .where(Cliente.id == cliente_id)
    )
    return db.scalars(stmt).unique().one_or_none()


def email_em_uso(db: Session, email: str, exclude_user_id: UUID | None = None) -> bool:
    stmt = select(Usuario).where(Usuario.email == email.lower())
    if exclude_user_id:
        stmt = stmt.where(Usuario.id != exclude_user_id)
    return db.scalar(stmt) is not None


def criar(db: Session, payload: ClienteCreate) -> Cliente:
    usuario = Usuario(
        nome=payload.nome,
        email=payload.email.lower(),
        senha_hash=hash_password(payload.senha),
        role=RoleUsuario.cliente,
        ativo=True,
    )
    cliente = Cliente(usuario=usuario, nome_empresa=payload.nome_empresa)
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


def atualizar(db: Session, cliente: Cliente, payload: ClienteUpdate) -> Cliente:
    if payload.nome is not None:
        cliente.usuario.nome = payload.nome
    if payload.email is not None:
        cliente.usuario.email = payload.email.lower()
    if payload.senha is not None:
        cliente.usuario.senha_hash = hash_password(payload.senha)
    if payload.ativo is not None:
        cliente.usuario.ativo = payload.ativo
    if payload.nome_empresa is not None:
        cliente.nome_empresa = payload.nome_empresa
    db.commit()
    db.refresh(cliente)
    return cliente


def remover(db: Session, cliente: Cliente) -> None:
    db.delete(cliente.usuario)
    db.commit()


def to_out_dict(cliente: Cliente) -> dict:
    return {
        "id": cliente.id,
        "usuario_id": cliente.usuario_id,
        "nome": cliente.usuario.nome,
        "email": cliente.usuario.email,
        "ativo": cliente.usuario.ativo,
        "nome_empresa": cliente.nome_empresa,
        "instagram_account_id": cliente.instagram_account_id,
        "instagram_conectado": cliente.instagram_account_id is not None,
        "token_expires_at": cliente.token_expires_at,
        "created_at": cliente.created_at,
        "updated_at": cliente.updated_at,
    }
