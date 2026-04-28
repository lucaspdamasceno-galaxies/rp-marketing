import os
import tempfile
from typing import Any
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import AdminUser, ClienteUser, DbSession
from app.models.contrato import StatusContrato
from app.schemas.common import Envelope, Page
from app.schemas.contrato import (
    ContratoAtivar,
    ContratoCancelar,
    ContratoCreate,
    ContratoOut,
    ContratoUpdate,
)
from app.services import (
    contrato_pdf_parser_service,
    contrato_service,
    storage_service,
)
from app.services.storage_service import PDF_MIMES

_role = "admin"

# ----------------- ADMIN -----------------
admin_router = APIRouter(prefix="/admin/contratos", tags=["admin/contratos"])


@admin_router.get("", response_model=Envelope[Page[ContratoOut]])
def admin_listar(
    _: AdminUser,
    db: DbSession,
    cliente_id: UUID | None = None,
    status_filtro: StatusContrato | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
) -> Envelope[Page[ContratoOut]]:
    items, total = contrato_service.listar_admin(
        db, cliente_id, status_filtro, page, page_size
    )
    return Envelope(
        data=Page[ContratoOut](
            items=[ContratoOut(**contrato_service.to_out_dict(c, role=_role)) for c in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@admin_router.post(
    "", response_model=Envelope[ContratoOut], status_code=status.HTTP_201_CREATED
)
def admin_criar(
    payload: ContratoCreate, current: AdminUser, db: DbSession
) -> Envelope[ContratoOut]:
    contrato = contrato_service.criar(db, payload, current.id)
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(contrato, role=_role)),
        message="contrato criado em rascunho",
    )


@admin_router.post(
    "/extrair-pdf",
    response_model=Envelope[dict[str, Any]],
)
async def admin_extrair_pdf(
    _: AdminUser,
    arquivo: UploadFile = File(...),
) -> Envelope[dict[str, Any]]:
    """Faz upload de um PDF de contrato e devolve os campos extraídos
    (titulo, escopo, valor_mensal, duracao_meses, data_inicio, descricao).

    NÃO persiste o contrato — apenas parseia. O frontend usa o resultado
    para pré-preencher o formulário de novo contrato.
    """
    if arquivo.content_type not in PDF_MIMES:
        raise HTTPException(
            status_code=415,
            detail=f"esperado application/pdf, recebido {arquivo.content_type}",
        )
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(tmp_fd, "wb") as f:
            while chunk := await arquivo.read(1024 * 1024):
                f.write(chunk)
        try:
            dados, _texto = contrato_pdf_parser_service.parse_contrato(tmp_path)
        except Exception as exc:
            raise HTTPException(
                status_code=422, detail=f"falha ao parsear PDF: {exc}"
            ) from exc
        return Envelope(data=dados)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@admin_router.get("/{contrato_id}", response_model=Envelope[ContratoOut])
def admin_obter(
    contrato_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[ContratoOut]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    return Envelope(data=ContratoOut(**contrato_service.to_out_dict(c, role=_role)))


@admin_router.put("/{contrato_id}", response_model=Envelope[ContratoOut])
def admin_atualizar(
    contrato_id: UUID,
    payload: ContratoUpdate,
    _: AdminUser,
    db: DbSession,
) -> Envelope[ContratoOut]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    c = contrato_service.atualizar(db, c, payload)
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(c, role=_role)),
        message="contrato atualizado",
    )


@admin_router.delete("/{contrato_id}", response_model=Envelope[None])
def admin_remover(
    contrato_id: UUID, _: AdminUser, db: DbSession
) -> Envelope[None]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    contrato_service.remover(db, c)
    return Envelope(message="contrato removido")


@admin_router.post(
    "/{contrato_id}/pdf", response_model=Envelope[ContratoOut]
)
async def admin_anexar_pdf(
    contrato_id: UUID,
    _: AdminUser,
    db: DbSession,
    arquivo: UploadFile = File(...),
) -> Envelope[ContratoOut]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    c = await contrato_service.anexar_pdf(db, c, arquivo)
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(c, role=_role)),
        message="PDF anexado",
    )


@admin_router.post(
    "/{contrato_id}/ativar", response_model=Envelope[ContratoOut]
)
def admin_ativar(
    contrato_id: UUID,
    payload: ContratoAtivar,
    _: AdminUser,
    db: DbSession,
) -> Envelope[ContratoOut]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    c = contrato_service.ativar(db, c, payload.assinado_em_externo)
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(c, role=_role)),
        message="contrato ativado",
    )


@admin_router.get("/{contrato_id}/download")
def admin_baixar_pdf(
    contrato_id: UUID, _: AdminUser, db: DbSession
) -> StreamingResponse:
    c = contrato_service.buscar(db, contrato_id)
    if not c or not c.pdf_path:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
    return _stream_pdf(c.pdf_path, c.pdf_nome_original)


@admin_router.post(
    "/{contrato_id}/cancelar", response_model=Envelope[ContratoOut]
)
def admin_cancelar(
    contrato_id: UUID,
    payload: ContratoCancelar,
    _: AdminUser,
    db: DbSession,
) -> Envelope[ContratoOut]:
    c = contrato_service.buscar(db, contrato_id)
    if not c:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    c = contrato_service.cancelar(db, c, payload.motivo)
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(c, role=_role)),
        message="contrato cancelado",
    )


# ----------------- CLIENTE -----------------
cliente_router = APIRouter(prefix="/contratos", tags=["contratos"])


@cliente_router.get("", response_model=Envelope[list[ContratoOut]])
def cliente_listar(
    current: ClienteUser, db: DbSession
) -> Envelope[list[ContratoOut]]:
    cliente = contrato_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    items = contrato_service.listar_cliente(db, cliente.id)
    return Envelope(
        data=[
            ContratoOut(**contrato_service.to_out_dict(c, role="cliente"))
            for c in items
        ]
    )


@cliente_router.get("/{contrato_id}", response_model=Envelope[ContratoOut])
def cliente_obter(
    contrato_id: UUID, current: ClienteUser, db: DbSession
) -> Envelope[ContratoOut]:
    cliente = contrato_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    c = contrato_service.buscar(db, contrato_id)
    if not c or c.cliente_id != cliente.id:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    if c.status == StatusContrato.rascunho:
        raise HTTPException(status_code=404, detail="contrato não encontrado")
    return Envelope(
        data=ContratoOut(**contrato_service.to_out_dict(c, role="cliente"))
    )


@cliente_router.get("/{contrato_id}/download")
def cliente_baixar_pdf(
    contrato_id: UUID, current: ClienteUser, db: DbSession
) -> StreamingResponse:
    cliente = contrato_service.cliente_do_usuario(db, current.id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    c = contrato_service.buscar(db, contrato_id)
    if not c or c.cliente_id != cliente.id or not c.pdf_path:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
    if c.status == StatusContrato.rascunho:
        raise HTTPException(status_code=404, detail="PDF não encontrado")
    return _stream_pdf(c.pdf_path, c.pdf_nome_original)


def _stream_pdf(rel_path: str, nome_original: str | None) -> StreamingResponse:
    """Lê o PDF do storage privado e devolve como attachment."""
    import io as _io

    try:
        data = storage_service.read_bytes(rel_path)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"falha ao ler PDF: {exc}"
        ) from exc

    filename = nome_original or "contrato.pdf"
    safe = filename.replace('"', "")
    headers = {
        "Content-Disposition": f'attachment; filename="{safe}"',
        "Cache-Control": "private, no-store",
    }
    return StreamingResponse(
        _io.BytesIO(data),
        media_type="application/pdf",
        headers=headers,
    )
