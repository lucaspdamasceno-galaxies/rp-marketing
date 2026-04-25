from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AdminUser, DbSession
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate
from app.schemas.common import Envelope, Page
from app.services import cliente_service

router = APIRouter(prefix="/admin/clientes", tags=["admin/clientes"])


@router.get("", response_model=Envelope[Page[ClienteOut]])
def listar_clientes(
    _: AdminUser,
    db: DbSession,
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[ClienteOut]]:
    items, total = cliente_service.listar(db, q, page, page_size)
    return Envelope(
        data=Page[ClienteOut](
            items=[ClienteOut(**cliente_service.to_out_dict(c)) for c in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.post("", response_model=Envelope[ClienteOut], status_code=status.HTTP_201_CREATED)
def criar_cliente(payload: ClienteCreate, _: AdminUser, db: DbSession) -> Envelope[ClienteOut]:
    if cliente_service.email_em_uso(db, payload.email):
        raise HTTPException(status_code=409, detail="email já cadastrado")
    cliente = cliente_service.criar(db, payload)
    return Envelope(data=ClienteOut(**cliente_service.to_out_dict(cliente)), message="cliente criado")


@router.get("/{cliente_id}", response_model=Envelope[ClienteOut])
def obter_cliente(cliente_id: UUID, _: AdminUser, db: DbSession) -> Envelope[ClienteOut]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    return Envelope(data=ClienteOut(**cliente_service.to_out_dict(cliente)))


@router.put("/{cliente_id}", response_model=Envelope[ClienteOut])
def atualizar_cliente(
    cliente_id: UUID, payload: ClienteUpdate, _: AdminUser, db: DbSession
) -> Envelope[ClienteOut]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    if payload.email and cliente_service.email_em_uso(db, payload.email, exclude_user_id=cliente.usuario_id):
        raise HTTPException(status_code=409, detail="email já cadastrado")
    cliente = cliente_service.atualizar(db, cliente, payload)
    return Envelope(data=ClienteOut(**cliente_service.to_out_dict(cliente)), message="cliente atualizado")


@router.delete("/{cliente_id}", response_model=Envelope[None])
def remover_cliente(cliente_id: UUID, _: AdminUser, db: DbSession) -> Envelope[None]:
    cliente = cliente_service.buscar(db, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    cliente_service.remover(db, cliente)
    return Envelope(message="cliente removido")
