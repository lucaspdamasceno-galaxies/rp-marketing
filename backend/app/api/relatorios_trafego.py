from datetime import date
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import AdminUser, ClienteUser, DbSession
from app.schemas.common import Envelope, Page
from app.schemas.relatorio_trafego import (
    RelatorioTrafegoComparacaoItem,
    RelatorioTrafegoDiff,
    RelatorioTrafegoOut,
    RelatorioTrafegoUpdate,
)
from app.services import relatorio_trafego_service

# ----------------- ADMIN -----------------
admin_router = APIRouter(prefix="/admin/relatorios-trafego", tags=["admin/trafego"])


@admin_router.get("", response_model=Envelope[Page[RelatorioTrafegoOut]])
def admin_listar(
    _: AdminUser,
    db: DbSession,
    cliente_id: UUID | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[RelatorioTrafegoOut]]:
    items, total = relatorio_trafego_service.listar_admin(
        db, cliente_id, page, page_size
    )
    return Envelope(
        data=Page[RelatorioTrafegoOut](
            items=[
                RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(r))
                for r in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@admin_router.post(
    "",
    response_model=Envelope[RelatorioTrafegoOut],
    status_code=status.HTTP_201_CREATED,
)
async def admin_upload_pdf(
    current: AdminUser,
    db: DbSession,
    cliente_id: UUID = Form(...),
    arquivo: UploadFile = File(...),
    periodo_inicio: date | None = Form(None),
    periodo_fim: date | None = Form(None),
) -> Envelope[RelatorioTrafegoOut]:
    relatorio = await relatorio_trafego_service.criar_via_upload(
        db, cliente_id, current.id, arquivo, periodo_inicio, periodo_fim
    )
    return Envelope(
        data=RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(relatorio)),
        message="relatório criado",
    )


@admin_router.get("/{relatorio_id}", response_model=Envelope[RelatorioTrafegoOut])
def admin_obter(
    relatorio_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[RelatorioTrafegoOut]:
    r = relatorio_trafego_service.buscar(db, relatorio_id)
    if not r:
        raise HTTPException(status_code=404, detail="relatório não encontrado")
    return Envelope(
        data=RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(r))
    )


@admin_router.put("/{relatorio_id}", response_model=Envelope[RelatorioTrafegoOut])
def admin_atualizar(
    relatorio_id: UUID,
    payload: RelatorioTrafegoUpdate,
    _: AdminUser,
    db: DbSession,
) -> Envelope[RelatorioTrafegoOut]:
    r = relatorio_trafego_service.buscar(db, relatorio_id)
    if not r:
        raise HTTPException(status_code=404, detail="relatório não encontrado")
    r = relatorio_trafego_service.atualizar(db, r, payload)
    return Envelope(
        data=RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(r)),
        message="relatório atualizado",
    )


@admin_router.delete("/{relatorio_id}", response_model=Envelope[None])
def admin_remover(
    relatorio_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[None]:
    r = relatorio_trafego_service.buscar(db, relatorio_id)
    if not r:
        raise HTTPException(status_code=404, detail="relatório não encontrado")
    relatorio_trafego_service.remover(db, r)
    return Envelope(message="relatório removido")


@admin_router.get(
    "/{relatorio_id}/comparar/{anterior_id}",
    response_model=Envelope[RelatorioTrafegoDiff],
)
def admin_comparar(
    relatorio_id: UUID,
    anterior_id: UUID,
    _: AdminUser,
    db: DbSession,
) -> Envelope[RelatorioTrafegoDiff]:
    diff = relatorio_trafego_service.comparar(db, relatorio_id, anterior_id)
    return Envelope(data=diff)


# ----------------- CLIENTE -----------------
cliente_router = APIRouter(prefix="/relatorios-trafego", tags=["trafego"])


@cliente_router.get("", response_model=Envelope[Page[RelatorioTrafegoOut]])
def cliente_listar(
    current: ClienteUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[RelatorioTrafegoOut]]:
    cliente = relatorio_trafego_service.buscar  # placeholder retirado abaixo
    from app.services import aprovacao_service  # reusa cliente_do_usuario

    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    items, total = relatorio_trafego_service.listar_por_cliente(
        db, cliente.id, page, page_size
    )
    return Envelope(
        data=Page[RelatorioTrafegoOut](
            items=[
                RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(r))
                for r in items
            ],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@cliente_router.get(
    "/serie", response_model=Envelope[list[RelatorioTrafegoComparacaoItem]]
)
def cliente_serie(
    current: ClienteUser, db: DbSession
) -> Envelope[list[RelatorioTrafegoComparacaoItem]]:
    """Série cronológica de todos os relatórios — usada pelo dashboard pra gráficos."""
    from app.services import aprovacao_service

    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    items, _ = relatorio_trafego_service.listar_por_cliente(
        db, cliente.id, page=1, page_size=200
    )
    items_ordenados = sorted(items, key=lambda r: r.periodo_inicio)
    return Envelope(
        data=[relatorio_trafego_service.to_comparacao_item(r) for r in items_ordenados]
    )


@cliente_router.get("/{relatorio_id}", response_model=Envelope[RelatorioTrafegoOut])
def cliente_obter(
    relatorio_id: UUID, current: ClienteUser, db: DbSession
) -> Envelope[RelatorioTrafegoOut]:
    from app.services import aprovacao_service

    cliente = aprovacao_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    r = relatorio_trafego_service.buscar(db, relatorio_id)
    if not r or r.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="relatório não encontrado")
    return Envelope(
        data=RelatorioTrafegoOut(**relatorio_trafego_service.to_out_dict(r))
    )
