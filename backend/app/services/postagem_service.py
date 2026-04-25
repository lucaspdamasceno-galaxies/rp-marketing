from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.postagem import Postagem


def listar_do_cliente(
    db: Session,
    cliente_id: UUID,
    periodo_inicio: datetime | None,
    periodo_fim: datetime | None,
    ordenar_por: str,
    page: int,
    page_size: int,
) -> tuple[list[Postagem], int]:
    base = select(Postagem).where(Postagem.cliente_id == cliente_id)
    if periodo_inicio:
        base = base.where(Postagem.data_publicacao >= periodo_inicio)
    if periodo_fim:
        base = base.where(Postagem.data_publicacao <= periodo_fim)

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    if ordenar_por == "engajamento":
        order = desc(Postagem.curtidas + Postagem.comentarios)
    else:
        order = desc(Postagem.data_publicacao)

    stmt = base.order_by(order).offset((page - 1) * page_size).limit(page_size)
    items = db.scalars(stmt).all()
    return list(items), total


def buscar_do_cliente(db: Session, cliente_id: UUID, postagem_id: UUID) -> Postagem | None:
    stmt = select(Postagem).where(
        Postagem.id == postagem_id, Postagem.cliente_id == cliente_id
    )
    return db.scalar(stmt)
