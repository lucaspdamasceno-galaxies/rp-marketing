from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import AdminUser, ClienteUser, DbSession
from app.models.aprovacao import StatusAprovacao
from app.models.cliente import Cliente
from app.schemas.aprovacao import (
    AprovacaoCreate,
    AprovacaoDecisao,
    AprovacaoOut,
    AprovacaoUpdate,
)
from app.schemas.common import Envelope, Page
from app.services import aprovacao_service

# ----------------- ADMIN -----------------
admin_router = APIRouter(prefix="/admin/aprovacoes", tags=["admin/aprovacoes"])


@admin_router.get("", response_model=Envelope[Page[AprovacaoOut]])
def admin_listar(
    _: AdminUser,
    db: DbSession,
    cliente_id: UUID | None = None,
    status_filtro: StatusAprovacao | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[AprovacaoOut]]:
    items, total = aprovacao_service.listar_admin(
        db, cliente_id, status_filtro, page, page_size
    )
    return Envelope(
        data=Page[AprovacaoOut](
            items=[AprovacaoOut(**aprovacao_service.to_out_dict(a)) for a in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@admin_router.post(
    "", response_model=Envelope[AprovacaoOut], status_code=status.HTTP_201_CREATED
)
def admin_criar(
    payload: AprovacaoCreate, current: AdminUser, db: DbSession
) -> Envelope[AprovacaoOut]:
    cliente = db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    aprovacao = aprovacao_service.criar(db, payload, current.id)
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(aprovacao)),
        message="proposta criada",
    )


@admin_router.get("/{aprovacao_id}", response_model=Envelope[AprovacaoOut])
def admin_obter(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="aprovação não encontrada")
    return Envelope(data=AprovacaoOut(**aprovacao_service.to_out_dict(a)))


@admin_router.put("/{aprovacao_id}", response_model=Envelope[AprovacaoOut])
def admin_atualizar(
    aprovacao_id: UUID,
    payload: AprovacaoUpdate,
    _: AdminUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="aprovação não encontrada")
    if a.status != StatusAprovacao.pendente:
        raise HTTPException(
            status_code=409,
            detail="só é possível editar aprovações pendentes",
        )
    a = aprovacao_service.atualizar(db, a, payload)
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(a)),
        message="proposta atualizada",
    )


@admin_router.delete("/{aprovacao_id}", response_model=Envelope[None])
def admin_remover(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[None]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="aprovação não encontrada")
    aprovacao_service.remover(db, a)
    return Envelope(message="proposta removida")


# ----------------- CLIENTE -----------------
cliente_router = APIRouter(prefix="/aprovacoes", tags=["aprovacoes"])


@cliente_router.get("", response_model=Envelope[Page[AprovacaoOut]])
def cliente_listar(
    current: ClienteUser,
    db: DbSession,
    status_filtro: StatusAprovacao | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[AprovacaoOut]]:
    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(
            status_code=404, detail="cliente não encontrado para este usuário"
        )
    items, total = aprovacao_service.listar_cliente(
        db, cliente.id, status_filtro, page, page_size
    )
    return Envelope(
        data=Page[AprovacaoOut](
            items=[AprovacaoOut(**aprovacao_service.to_out_dict(a)) for a in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@cliente_router.get("/{aprovacao_id}", response_model=Envelope[AprovacaoOut])
def cliente_obter(
    aprovacao_id: UUID, current: ClienteUser, db: DbSession
) -> Envelope[AprovacaoOut]:
    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a or a.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="aprovação não encontrada")
    return Envelope(data=AprovacaoOut(**aprovacao_service.to_out_dict(a)))


@cliente_router.post(
    "/{aprovacao_id}/aprovar", response_model=Envelope[AprovacaoOut]
)
def cliente_aprovar(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = _carregar_pendente(db, current.id, aprovacao_id)
    a = aprovacao_service.decidir(
        db, a, StatusAprovacao.aprovado, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(a)),
        message="postagem aprovada",
    )


@cliente_router.post(
    "/{aprovacao_id}/rejeitar", response_model=Envelope[AprovacaoOut]
)
def cliente_rejeitar(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    if not payload.comentario or not payload.comentario.strip():
        raise HTTPException(
            status_code=422,
            detail="comentário obrigatório para rejeitar uma postagem",
        )
    a = _carregar_pendente(db, current.id, aprovacao_id)
    a = aprovacao_service.decidir(
        db, a, StatusAprovacao.rejeitado, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(a)),
        message="postagem rejeitada",
    )


def _carregar_pendente(db, usuario_id: UUID, aprovacao_id: UUID):
    cliente = aprovacao_service.cliente_do_usuario(db, usuario_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a or a.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="aprovação não encontrada")
    if a.status != StatusAprovacao.pendente:
        raise HTTPException(
            status_code=409,
            detail="essa proposta já foi decidida",
        )
    return a
