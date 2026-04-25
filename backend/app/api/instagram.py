from uuid import UUID

from fastapi import APIRouter, HTTPException

from app.api.deps import AdminUser, DbSession
from app.schemas.common import Envelope
from app.schemas.instagram import InstagramConectarIn, InstagramConectarOut
from app.services import cliente_service, instagram_service

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
        novas = instagram_service.sincronizar_postagens(db, cliente)
    except instagram_service.InstagramError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return Envelope(data={"postagens_novas": novas}, message="sincronização concluída")
