from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.aprovacao import Aprovacao, StatusAprovacao
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.aprovacao import AprovacaoCreate, AprovacaoUpdate


def _base_query():
    return (
        select(Aprovacao)
        .options(
            joinedload(Aprovacao.cliente),
            joinedload(Aprovacao.admin),
        )
    )


def listar_admin(
    db: Session,
    cliente_id: UUID | None,
    status: StatusAprovacao | None,
    page: int,
    page_size: int,
) -> tuple[list[Aprovacao], int]:
    base = _base_query()
    if cliente_id:
        base = base.where(Aprovacao.cliente_id == cliente_id)
    if status:
        base = base.where(Aprovacao.status == status)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(Aprovacao.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return list(items), total


def listar_cliente(
    db: Session,
    cliente_id: UUID,
    status: StatusAprovacao | None,
    page: int,
    page_size: int,
) -> tuple[list[Aprovacao], int]:
    base = _base_query().where(Aprovacao.cliente_id == cliente_id)
    if status:
        base = base.where(Aprovacao.status == status)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(Aprovacao.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return list(items), total


def buscar(db: Session, aprovacao_id: UUID) -> Aprovacao | None:
    stmt = _base_query().where(Aprovacao.id == aprovacao_id)
    return db.scalars(stmt).unique().one_or_none()


def criar(db: Session, payload: AprovacaoCreate, admin_id: UUID) -> Aprovacao:
    aprovacao = Aprovacao(
        cliente_id=payload.cliente_id,
        admin_id=admin_id,
        tipo=payload.tipo,
        url_midia=payload.url_midia,
        legenda=payload.legenda,
        data_agendada=payload.data_agendada,
        status=StatusAprovacao.pendente,
    )
    db.add(aprovacao)
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def atualizar(
    db: Session, aprovacao: Aprovacao, payload: AprovacaoUpdate
) -> Aprovacao:
    if payload.tipo is not None:
        aprovacao.tipo = payload.tipo
    if payload.url_midia is not None:
        aprovacao.url_midia = payload.url_midia
    if payload.legenda is not None:
        aprovacao.legenda = payload.legenda
    if payload.data_agendada is not None:
        aprovacao.data_agendada = payload.data_agendada
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def decidir(
    db: Session,
    aprovacao: Aprovacao,
    novo_status: StatusAprovacao,
    comentario: str | None,
) -> Aprovacao:
    aprovacao.status = novo_status
    aprovacao.comentario_revisao = comentario
    aprovacao.decidido_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def remover(db: Session, aprovacao: Aprovacao) -> None:
    db.delete(aprovacao)
    db.commit()


def to_out_dict(a: Aprovacao) -> dict:
    return {
        "id": a.id,
        "cliente_id": a.cliente_id,
        "cliente_nome_empresa": a.cliente.nome_empresa if a.cliente else None,
        "admin_id": a.admin_id,
        "admin_nome": a.admin.nome if a.admin else None,
        "tipo": a.tipo,
        "url_midia": a.url_midia,
        "legenda": a.legenda,
        "data_agendada": a.data_agendada,
        "status": a.status,
        "comentario_revisao": a.comentario_revisao,
        "decidido_em": a.decidido_em,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


def cliente_do_usuario(db: Session, usuario_id: UUID) -> Cliente | None:
    return db.scalar(select(Cliente).where(Cliente.usuario_id == usuario_id))


__all__ = [
    "listar_admin",
    "listar_cliente",
    "buscar",
    "criar",
    "atualizar",
    "decidir",
    "remover",
    "to_out_dict",
    "cliente_do_usuario",
    "Usuario",
]
