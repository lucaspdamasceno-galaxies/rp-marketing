from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import asc, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.cliente import Cliente
from app.models.metricas_mensais import MetricasMensais
from app.schemas.metricas_mensais import (
    MetricasMensaisBase,
    MetricasMensaisCreate,
    MetricasMensaisUpdate,
)


def _base_query():
    return select(MetricasMensais).options(joinedload(MetricasMensais.cliente))


def buscar(db: Session, mid: UUID) -> MetricasMensais | None:
    return db.scalars(_base_query().where(MetricasMensais.id == mid)).unique().one_or_none()


def listar_por_cliente(
    db: Session, cliente_id: UUID, ordem: str = "desc"
) -> list[MetricasMensais]:
    stmt = _base_query().where(MetricasMensais.cliente_id == cliente_id)
    if ordem == "asc":
        stmt = stmt.order_by(asc(MetricasMensais.ano_mes))
    else:
        stmt = stmt.order_by(desc(MetricasMensais.ano_mes))
    return list(db.scalars(stmt).unique().all())


def criar(
    db: Session, payload: MetricasMensaisCreate, admin_id: UUID
) -> MetricasMensais:
    cliente = db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    metric = MetricasMensais(
        cliente_id=payload.cliente_id,
        admin_id=admin_id,
        ano_mes=payload.ano_mes,
        **payload.model_dump(exclude={"cliente_id", "ano_mes"}),
    )
    db.add(metric)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="já existem métricas para esse cliente nesse ano-mês — use PUT para atualizar",
        )
    db.refresh(metric)
    return metric


def atualizar(
    db: Session, metric: MetricasMensais, payload: MetricasMensaisUpdate
) -> MetricasMensais:
    for campo, valor in payload.model_dump(exclude_unset=True).items():
        setattr(metric, campo, valor)
    db.commit()
    db.refresh(metric)
    return metric


def remover(db: Session, metric: MetricasMensais) -> None:
    db.delete(metric)
    db.commit()


def upsert(
    db: Session,
    cliente_id: UUID,
    ano_mes: str,
    payload: MetricasMensaisBase,
    admin_id: UUID,
) -> MetricasMensais:
    """Cria ou atualiza pelo par (cliente_id, ano_mes)."""
    existente = db.scalar(
        select(MetricasMensais)
        .where(MetricasMensais.cliente_id == cliente_id)
        .where(MetricasMensais.ano_mes == ano_mes)
    )
    if existente:
        return atualizar(
            db, existente, MetricasMensaisUpdate(**payload.model_dump())
        )
    return criar(
        db,
        MetricasMensaisCreate(
            cliente_id=cliente_id, ano_mes=ano_mes, **payload.model_dump()
        ),
        admin_id,
    )


def total_por_cliente(db: Session, cliente_id: UUID) -> int:
    return (
        db.scalar(
            select(func.count(MetricasMensais.id)).where(
                MetricasMensais.cliente_id == cliente_id
            )
        )
        or 0
    )


def to_out_dict(m: MetricasMensais) -> dict:
    return {
        "id": m.id,
        "cliente_id": m.cliente_id,
        "cliente_nome_empresa": m.cliente.nome_empresa if m.cliente else None,
        "admin_id": m.admin_id,
        "ano_mes": m.ano_mes,
        "seguidores": m.seguidores,
        "seguidores_ganhos": m.seguidores_ganhos,
        "seguidores_perdidos": m.seguidores_perdidos,
        "alcance": m.alcance,
        "impressoes": m.impressoes,
        "visualizacoes": m.visualizacoes,
        "curtidas": m.curtidas,
        "comentarios": m.comentarios,
        "compartilhamentos": m.compartilhamentos,
        "salvamentos": m.salvamentos,
        "visitas_perfil": m.visitas_perfil,
        "cliques_site": m.cliques_site,
        "total_postagens": m.total_postagens,
        "total_stories": m.total_stories,
        "total_reels": m.total_reels,
        "observacoes": m.observacoes,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }
