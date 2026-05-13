from datetime import date
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.cliente import Cliente
from app.models.metricas_mensais import MetricasMensais
from app.schemas.metricas_mensais import (
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
        stmt = stmt.order_by(asc(MetricasMensais.data_inicio))
    else:
        stmt = stmt.order_by(desc(MetricasMensais.data_inicio))
    return list(db.scalars(stmt).unique().all())


def listar_no_periodo(
    db: Session, cliente_id: UUID, periodo_inicio: date, periodo_fim: date
) -> list[MetricasMensais]:
    """Retorna registros que sobrepõem o período [periodo_inicio, periodo_fim]."""
    stmt = (
        _base_query()
        .where(
            MetricasMensais.cliente_id == cliente_id,
            MetricasMensais.data_fim >= periodo_inicio,
            MetricasMensais.data_inicio <= periodo_fim,
        )
        .order_by(asc(MetricasMensais.data_inicio))
    )
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
        **payload.model_dump(exclude={"cliente_id"}),
    )
    db.add(metric)
    db.commit()
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
        "data_inicio": m.data_inicio,
        "data_fim": m.data_fim,
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
        "campos_customizados": m.campos_customizados or [],
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }
