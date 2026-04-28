from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import AdminUser, ClienteUser, CurrentUser, DbSession
from app.models.aprovacao import StatusAprovacao
from app.models.cliente import Cliente
from app.schemas.aprovacao import (
    AprovacaoComentarioCreate,
    AprovacaoComentarioOut,
    AprovacaoCreate,
    AprovacaoDecisao,
    AprovacaoDetail,
    AprovacaoMidiaOut,
    AprovacaoOut,
    AprovacaoStatusAdmin,
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
    status_texto: StatusAprovacao | None = None,
    status_arte: StatusAprovacao | None = None,
    postado: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
) -> Envelope[Page[AprovacaoOut]]:
    items, total = aprovacao_service.listar_admin(
        db, cliente_id, status_texto, status_arte, postado, page, page_size
    )
    return Envelope(
        data=Page[AprovacaoOut](
            items=[AprovacaoOut(**aprovacao_service.to_out_dict(db, a)) for a in items],
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
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, aprovacao)),
        message="card criado",
    )


@admin_router.get("/{aprovacao_id}", response_model=Envelope[AprovacaoDetail])
def admin_obter(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[AprovacaoDetail]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    base = aprovacao_service.to_out_dict(db, a)
    base["comentarios"] = [
        aprovacao_service.comentario_to_out(c)
        for c in aprovacao_service.listar_comentarios(db, a.id)
    ]
    return Envelope(data=AprovacaoDetail(**base))


@admin_router.put("/{aprovacao_id}", response_model=Envelope[AprovacaoOut])
def admin_atualizar(
    aprovacao_id: UUID,
    payload: AprovacaoUpdate,
    _: AdminUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    a = aprovacao_service.atualizar(db, a, payload)
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="card atualizado",
    )


@admin_router.delete("/{aprovacao_id}", response_model=Envelope[None])
def admin_remover(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[None]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    aprovacao_service.remover(db, a)
    return Envelope(message="card removido")


@admin_router.post(
    "/{aprovacao_id}/midias",
    response_model=Envelope[list[AprovacaoMidiaOut]],
    status_code=status.HTTP_201_CREATED,
)
async def admin_adicionar_midias(
    aprovacao_id: UUID,
    _: AdminUser,
    db: DbSession,
    arquivos: list[UploadFile] = File(...),
) -> Envelope[list[AprovacaoMidiaOut]]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    novas = await aprovacao_service.adicionar_midias(db, a, arquivos)
    return Envelope(
        data=[AprovacaoMidiaOut(**aprovacao_service.midia_to_out(m)) for m in novas],
        message=f"{len(novas)} mídia(s) adicionada(s)",
    )


@admin_router.delete(
    "/{aprovacao_id}/midias/{midia_id}", response_model=Envelope[None]
)
def admin_remover_midia(
    aprovacao_id: UUID,
    midia_id: UUID,
    _: AdminUser,
    db: DbSession,
) -> Envelope[None]:
    midia = aprovacao_service.buscar_midia(db, midia_id)
    if not midia or midia.aprovacao_id != aprovacao_id:
        raise HTTPException(status_code=404, detail="mídia não encontrada")
    aprovacao_service.remover_midia(db, midia)
    return Envelope(message="mídia removida")


@admin_router.post(
    "/{aprovacao_id}/postado", response_model=Envelope[AprovacaoOut]
)
def admin_marcar_postado(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    a = aprovacao_service.marcar_postado(db, a)
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="card marcado como postado",
    )


@admin_router.delete(
    "/{aprovacao_id}/postado", response_model=Envelope[AprovacaoOut]
)
def admin_desfazer_postado(
    aprovacao_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    a = aprovacao_service.desfazer_postado(db, a)
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="postagem desfeita",
    )


@admin_router.post(
    "/{aprovacao_id}/status", response_model=Envelope[AprovacaoOut]
)
def admin_setar_status(
    aprovacao_id: UUID,
    payload: AprovacaoStatusAdmin,
    _: AdminUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    a = aprovacao_service.setar_status_admin(
        db, a, payload.status_texto, payload.status_arte
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="status atualizado",
    )


# ----------------- CLIENTE -----------------
cliente_router = APIRouter(prefix="/aprovacoes", tags=["aprovacoes"])


@cliente_router.get("", response_model=Envelope[Page[AprovacaoOut]])
def cliente_listar(
    current: ClienteUser,
    db: DbSession,
    status_texto: StatusAprovacao | None = None,
    status_arte: StatusAprovacao | None = None,
    postado: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
) -> Envelope[Page[AprovacaoOut]]:
    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(
            status_code=404, detail="cliente não encontrado para este usuário"
        )
    items, total = aprovacao_service.listar_cliente(
        db, cliente.id, status_texto, status_arte, postado, page, page_size
    )
    return Envelope(
        data=Page[AprovacaoOut](
            items=[AprovacaoOut(**aprovacao_service.to_out_dict(db, a)) for a in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@cliente_router.get("/{aprovacao_id}", response_model=Envelope[AprovacaoDetail])
def cliente_obter(
    aprovacao_id: UUID, current: ClienteUser, db: DbSession
) -> Envelope[AprovacaoDetail]:
    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a or a.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="card não encontrado")
    base = aprovacao_service.to_out_dict(db, a)
    base["comentarios"] = [
        aprovacao_service.comentario_to_out(c)
        for c in aprovacao_service.listar_comentarios(db, a.id)
    ]
    return Envelope(data=AprovacaoDetail(**base))


@cliente_router.post(
    "/{aprovacao_id}/aprovar-texto", response_model=Envelope[AprovacaoOut]
)
def cliente_aprovar_texto(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = _carregar(db, current.id, aprovacao_id)
    if a.status_texto != StatusAprovacao.pendente:
        raise HTTPException(
            status_code=409, detail="texto já foi decidido"
        )
    a = aprovacao_service.decidir_texto(
        db, a, StatusAprovacao.aprovado, current.id, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="texto aprovado",
    )


@cliente_router.post(
    "/{aprovacao_id}/rejeitar-texto", response_model=Envelope[AprovacaoOut]
)
def cliente_rejeitar_texto(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    if not payload.comentario or not payload.comentario.strip():
        raise HTTPException(
            status_code=422, detail="comentário obrigatório para rejeitar"
        )
    a = _carregar(db, current.id, aprovacao_id)
    if a.status_texto != StatusAprovacao.pendente:
        raise HTTPException(status_code=409, detail="texto já foi decidido")
    a = aprovacao_service.decidir_texto(
        db, a, StatusAprovacao.rejeitado, current.id, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="texto rejeitado",
    )


@cliente_router.post(
    "/{aprovacao_id}/aprovar-arte", response_model=Envelope[AprovacaoOut]
)
def cliente_aprovar_arte(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    a = _carregar(db, current.id, aprovacao_id)
    if a.status_arte != StatusAprovacao.pendente:
        raise HTTPException(status_code=409, detail="arte já foi decidida")
    a = aprovacao_service.decidir_arte(
        db, a, StatusAprovacao.aprovado, current.id, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="arte aprovada",
    )


@cliente_router.post(
    "/{aprovacao_id}/rejeitar-arte", response_model=Envelope[AprovacaoOut]
)
def cliente_rejeitar_arte(
    aprovacao_id: UUID,
    payload: AprovacaoDecisao,
    current: ClienteUser,
    db: DbSession,
) -> Envelope[AprovacaoOut]:
    if not payload.comentario or not payload.comentario.strip():
        raise HTTPException(
            status_code=422, detail="comentário obrigatório para rejeitar"
        )
    a = _carregar(db, current.id, aprovacao_id)
    if a.status_arte != StatusAprovacao.pendente:
        raise HTTPException(status_code=409, detail="arte já foi decidida")
    a = aprovacao_service.decidir_arte(
        db, a, StatusAprovacao.rejeitado, current.id, payload.comentario
    )
    return Envelope(
        data=AprovacaoOut(**aprovacao_service.to_out_dict(db, a)),
        message="arte rejeitada",
    )


# ----------------- COMENTÁRIOS (admin + cliente) -----------------
comentarios_router = APIRouter(
    prefix="/aprovacoes/{aprovacao_id}/comentarios", tags=["aprovacoes/comentarios"]
)


@comentarios_router.get("", response_model=Envelope[list[AprovacaoComentarioOut]])
def listar_comentarios(
    aprovacao_id: UUID, current: CurrentUser, db: DbSession
) -> Envelope[list[AprovacaoComentarioOut]]:
    a = _autorizar_visualizacao(db, current, aprovacao_id)
    comentarios = aprovacao_service.listar_comentarios(db, a.id)
    return Envelope(
        data=[
            AprovacaoComentarioOut(**aprovacao_service.comentario_to_out(c))
            for c in comentarios
        ]
    )


@comentarios_router.post(
    "",
    response_model=Envelope[AprovacaoComentarioOut],
    status_code=status.HTTP_201_CREATED,
)
def criar_comentario(
    aprovacao_id: UUID,
    payload: AprovacaoComentarioCreate,
    current: CurrentUser,
    db: DbSession,
) -> Envelope[AprovacaoComentarioOut]:
    a = _autorizar_visualizacao(db, current, aprovacao_id)
    comentario = aprovacao_service.adicionar_comentario(
        db, a, current.id, payload.mensagem
    )
    return Envelope(
        data=AprovacaoComentarioOut(**aprovacao_service.comentario_to_out(comentario))
    )


@comentarios_router.post(
    "/com-anexos",
    response_model=Envelope[AprovacaoComentarioOut],
    status_code=status.HTTP_201_CREATED,
)
async def criar_comentario_com_anexos(
    aprovacao_id: UUID,
    current: CurrentUser,
    db: DbSession,
    mensagem: str = Form(..., min_length=1, max_length=4000),
    arquivos: list[UploadFile] = File(default=[]),
) -> Envelope[AprovacaoComentarioOut]:
    a = _autorizar_visualizacao(db, current, aprovacao_id)
    comentario = await aprovacao_service.adicionar_comentario_com_anexos(
        db, a, current.id, mensagem, arquivos or []
    )
    return Envelope(
        data=AprovacaoComentarioOut(**aprovacao_service.comentario_to_out(comentario))
    )


# ----------------- helpers -----------------


def _carregar(db, usuario_id: UUID, aprovacao_id: UUID):
    cliente = aprovacao_service.cliente_do_usuario(db, usuario_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a or a.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="card não encontrado")
    return a


def _autorizar_visualizacao(db, current, aprovacao_id: UUID):
    """Admin vê qualquer card; cliente só os próprios."""
    from app.models.usuario import RoleUsuario

    a = aprovacao_service.buscar(db, aprovacao_id)
    if not a:
        raise HTTPException(status_code=404, detail="card não encontrado")
    if current.role == RoleUsuario.cliente:
        cliente = aprovacao_service.cliente_do_usuario(db, current.id)
        if not cliente or a.cliente_id != cliente.id:
            raise HTTPException(status_code=404, detail="card não encontrado")
    return a
