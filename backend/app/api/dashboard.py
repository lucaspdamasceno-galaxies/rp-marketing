from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import ClienteUser, DbSession
from app.models.cliente import Cliente
from app.schemas.common import Envelope
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=Envelope[DashboardOut])
def obter_dashboard(
    current: ClienteUser,
    db: DbSession,
    periodo_inicio: datetime | None = Query(default=None),
    periodo_fim: datetime | None = Query(default=None),
) -> Envelope[DashboardOut]:
    cliente = db.scalar(select(Cliente).where(Cliente.usuario_id == current.id))
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    return Envelope(
        data=dashboard_service.montar_dashboard(
            db, cliente.id, periodo_inicio=periodo_inicio, periodo_fim=periodo_fim
        )
    )
