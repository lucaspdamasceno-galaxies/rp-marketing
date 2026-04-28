from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AdminUser, ClienteUser, DbSession
from app.schemas.common import Envelope
from app.schemas.metricas_mensais import (
    MetricasMensaisCreate,
    MetricasMensaisOut,
    MetricasMensaisUpdate,
)
from app.services import aprovacao_service, metricas_mensais_service

# ----------------- ADMIN -----------------
admin_router = APIRouter(prefix="/admin/metricas-mensais", tags=["admin/metricas"])


@admin_router.get(
    "/cliente/{cliente_id}", response_model=Envelope[list[MetricasMensaisOut]]
)
def admin_listar_por_cliente(
    cliente_id: UUID,
    _: AdminUser,
    db: DbSession,
    ordem: str = Query("desc", pattern="^(asc|desc)$"),
) -> Envelope[list[MetricasMensaisOut]]:
    items = metricas_mensais_service.listar_por_cliente(db, cliente_id, ordem)
    return Envelope(
        data=[
            MetricasMensaisOut(**metricas_mensais_service.to_out_dict(m))
            for m in items
        ]
    )


@admin_router.post(
    "",
    response_model=Envelope[MetricasMensaisOut],
    status_code=status.HTTP_201_CREATED,
)
def admin_criar(
    payload: MetricasMensaisCreate,
    current: AdminUser,
    db: DbSession,
) -> Envelope[MetricasMensaisOut]:
    metric = metricas_mensais_service.criar(db, payload, current.id)
    return Envelope(
        data=MetricasMensaisOut(**metricas_mensais_service.to_out_dict(metric)),
        message="métricas registradas",
    )


@admin_router.put(
    "/{metric_id}", response_model=Envelope[MetricasMensaisOut]
)
def admin_atualizar(
    metric_id: UUID,
    payload: MetricasMensaisUpdate,
    _: AdminUser,
    db: DbSession,
) -> Envelope[MetricasMensaisOut]:
    metric = metricas_mensais_service.buscar(db, metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="registro não encontrado")
    metric = metricas_mensais_service.atualizar(db, metric, payload)
    return Envelope(
        data=MetricasMensaisOut(**metricas_mensais_service.to_out_dict(metric)),
        message="métricas atualizadas",
    )


@admin_router.delete("/{metric_id}", response_model=Envelope[None])
def admin_remover(
    metric_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[None]:
    metric = metricas_mensais_service.buscar(db, metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail="registro não encontrado")
    metricas_mensais_service.remover(db, metric)
    return Envelope(message="registro removido")


# ----------------- CLIENTE -----------------
cliente_router = APIRouter(prefix="/metricas-mensais", tags=["metricas"])


@cliente_router.get("", response_model=Envelope[list[MetricasMensaisOut]])
def cliente_listar(
    current: ClienteUser,
    db: DbSession,
    ordem: str = Query("asc", pattern="^(asc|desc)$"),
) -> Envelope[list[MetricasMensaisOut]]:
    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    items = metricas_mensais_service.listar_por_cliente(db, cliente.id, ordem)
    return Envelope(
        data=[
            MetricasMensaisOut(**metricas_mensais_service.to_out_dict(m))
            for m in items
        ]
    )
