from uuid import UUID

from fastapi import APIRouter, Header, HTTPException

from app.api.deps import AdminUser, DbSession
from app.core.config import settings
from app.schemas.common import Envelope
from app.schemas.instagram import InstagramConectarIn, InstagramConectarOut
from app.schemas.sync_schedule import SyncScheduleIn, SyncScheduleOut
from app.services import cliente_service, instagram_service, scheduler_service

router = APIRouter(prefix="/admin/instagram", tags=["admin/instagram"])


@router.post("/conectar", response_model=Envelope[InstagramConectarOut])
def conectar_instagram(
    payload: InstagramConectarIn, _: AdminUser, db: DbSession
) -> Envelope[InstagramConectarOut]:
    cliente = cliente_service.buscar(db, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    try:
        cliente = instagram_service.conectar_cliente(
            db, cliente, payload.code, payload.redirect_uri
        )
    except instagram_service.InstagramError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return Envelope(
        data=InstagramConectarOut(
            cliente_id=cliente.id,
            instagram_account_id=cliente.instagram_account_id or "",
            token_expires_at=cliente.token_expires_at.isoformat() if cliente.token_expires_at else None,
        ),
        message="conta Instagram conectada",
    )


@router.post("/sync/{cliente_id}", response_model=Envelope[dict])
def sincronizar(cliente_id: UUID, _: AdminUser, db: DbSession) -> Envelope[dict]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    try:
        resultado = instagram_service.sincronizar_postagens(db, cliente)
    except instagram_service.InstagramError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return Envelope(data=resultado, message="sincronização concluída")


@router.post("/schedule/{cliente_id}", response_model=Envelope[SyncScheduleOut])
def criar_ou_atualizar_schedule(
    cliente_id: UUID, payload: SyncScheduleIn, _: AdminUser, db: DbSession
) -> Envelope[SyncScheduleOut]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    if not cliente.instagram_account_id:
        raise HTTPException(status_code=400, detail="conecte o Instagram antes de agendar")

    try:
        job_name = scheduler_service.upsert_job(cliente_id, payload.cron)
    except scheduler_service.SchedulerError as exc:
        raise HTTPException(status_code=500, detail=f"falha no Cloud Scheduler: {exc}")

    cliente.sync_cron = payload.cron
    cliente.sync_scheduler_job = job_name
    db.commit()
    db.refresh(cliente)

    return Envelope(
        data=SyncScheduleOut(
            cliente_id=cliente.id,
            cron=cliente.sync_cron,
            scheduler_job=cliente.sync_scheduler_job,
        ),
        message="agendamento criado",
    )


@router.delete("/schedule/{cliente_id}", response_model=Envelope[SyncScheduleOut])
def remover_schedule(
    cliente_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[SyncScheduleOut]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")

    try:
        scheduler_service.delete_job(cliente_id)
    except scheduler_service.SchedulerError as exc:
        raise HTTPException(status_code=500, detail=f"falha no Cloud Scheduler: {exc}")

    cliente.sync_cron = None
    cliente.sync_scheduler_job = None
    db.commit()
    db.refresh(cliente)

    return Envelope(
        data=SyncScheduleOut(cliente_id=cliente.id, cron=None, scheduler_job=None),
        message="agendamento removido",
    )


internal_router = APIRouter(prefix="/internal/instagram", tags=["internal"])


@internal_router.post("/sync/{cliente_id}", response_model=Envelope[dict])
def sync_interno(
    cliente_id: UUID,
    db: DbSession,
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> Envelope[dict]:
    if not settings.INTERNAL_SYNC_TOKEN:
        raise HTTPException(status_code=503, detail="endpoint interno desabilitado")
    if x_internal_token != settings.INTERNAL_SYNC_TOKEN:
        raise HTTPException(status_code=401, detail="token interno inválido")

    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    try:
        resultado = instagram_service.sincronizar_postagens(db, cliente)
    except instagram_service.InstagramError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return Envelope(data=resultado, message="sincronização concluída")
