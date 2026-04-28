from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.cliente import Cliente
from app.models.contrato import Contrato, StatusContrato
from app.schemas.contrato import ContratoCreate, ContratoUpdate
from app.services import storage_service


def _base_query():
    return select(Contrato).options(
        joinedload(Contrato.cliente), joinedload(Contrato.admin)
    )


def buscar(db: Session, contrato_id: UUID) -> Contrato | None:
    return db.scalars(
        _base_query().where(Contrato.id == contrato_id)
    ).unique().one_or_none()


def listar_admin(
    db: Session,
    cliente_id: UUID | None,
    status: StatusContrato | None,
    page: int,
    page_size: int,
) -> tuple[list[Contrato], int]:
    base = _base_query()
    if cliente_id:
        base = base.where(Contrato.cliente_id == cliente_id)
    if status:
        base = base.where(Contrato.status == status)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(Contrato.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(stmt).unique().all()), total


def listar_cliente(db: Session, cliente_id: UUID) -> list[Contrato]:
    """Cliente só vê contratos ativos, encerrados ou cancelados (não rascunho)."""
    stmt = (
        _base_query()
        .where(Contrato.cliente_id == cliente_id)
        .where(Contrato.status != StatusContrato.rascunho)
        .order_by(desc(Contrato.created_at))
    )
    return list(db.scalars(stmt).unique().all())


def _data_fim(inicio: date, meses: int) -> date:
    """Calcula data_fim adicionando `meses` meses a `inicio`."""
    ano = inicio.year + (inicio.month - 1 + meses) // 12
    mes = (inicio.month - 1 + meses) % 12 + 1
    bissexto = ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)
    dias_no_mes = [31, 29 if bissexto else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    dia = min(inicio.day, dias_no_mes[mes - 1])
    return date(ano, mes, dia)


def criar(db: Session, payload: ContratoCreate, admin_id: UUID) -> Contrato:
    cliente = db.get(Cliente, payload.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")
    contrato = Contrato(
        cliente_id=payload.cliente_id,
        admin_id=admin_id,
        titulo=payload.titulo,
        escopo=payload.escopo,
        descricao=payload.descricao,
        valor_mensal=payload.valor_mensal,
        duracao_meses=payload.duracao_meses,
        data_inicio=payload.data_inicio,
        data_fim=_data_fim(payload.data_inicio, payload.duracao_meses),
        status=StatusContrato.rascunho,
    )
    db.add(contrato)
    db.commit()
    db.refresh(contrato)
    return contrato


def atualizar(
    db: Session, contrato: Contrato, payload: ContratoUpdate
) -> Contrato:
    if contrato.status == StatusContrato.cancelado:
        raise HTTPException(
            status_code=409, detail="contrato cancelado não pode ser editado"
        )
    if payload.titulo is not None:
        contrato.titulo = payload.titulo
    if payload.escopo is not None:
        contrato.escopo = payload.escopo
    if payload.descricao is not None:
        contrato.descricao = payload.descricao
    if payload.valor_mensal is not None:
        contrato.valor_mensal = payload.valor_mensal
    if payload.duracao_meses is not None:
        contrato.duracao_meses = payload.duracao_meses
    if payload.data_inicio is not None:
        contrato.data_inicio = payload.data_inicio
    contrato.data_fim = _data_fim(contrato.data_inicio, contrato.duracao_meses)
    db.commit()
    db.refresh(contrato)
    return contrato


def remover(db: Session, contrato: Contrato) -> None:
    if contrato.status != StatusContrato.rascunho:
        raise HTTPException(
            status_code=409, detail="só é possível remover contratos em rascunho"
        )
    pdf = contrato.pdf_path
    db.delete(contrato)
    db.commit()
    if pdf:
        storage_service.remover(pdf)


async def anexar_pdf(
    db: Session, contrato: Contrato, upload: UploadFile
) -> Contrato:
    if contrato.pdf_path:
        storage_service.remover(contrato.pdf_path)
    info = await storage_service.salvar_upload(
        upload,
        kind="contratos",
        owner_id=contrato.id,
        allowed_mimes=storage_service.PDF_MIMES,
    )
    contrato.pdf_path = info["path"]
    contrato.pdf_nome_original = info["nome_original"]
    db.commit()
    db.refresh(contrato)
    return contrato


def ativar(
    db: Session, contrato: Contrato, assinado_em_externo: date | None
) -> Contrato:
    """Admin ativa o contrato após o cliente assinar externamente.

    Exige que o PDF já tenha sido anexado.
    """
    if contrato.status != StatusContrato.rascunho:
        raise HTTPException(
            status_code=409, detail="só é possível ativar contratos em rascunho"
        )
    if not contrato.pdf_path:
        raise HTTPException(
            status_code=409,
            detail="anexe o PDF assinado antes de ativar o contrato",
        )
    contrato.status = StatusContrato.ativo
    contrato.assinado_em_externo = assinado_em_externo or date.today()
    db.commit()
    db.refresh(contrato)
    return contrato


def cancelar(
    db: Session, contrato: Contrato, motivo: str | None
) -> Contrato:
    if contrato.status in (StatusContrato.encerrado, StatusContrato.cancelado):
        raise HTTPException(
            status_code=409, detail="contrato já está encerrado ou cancelado"
        )
    contrato.status = StatusContrato.cancelado
    contrato.cancelado_em = datetime.now(timezone.utc)
    contrato.motivo_cancelamento = motivo
    db.commit()
    db.refresh(contrato)
    return contrato


def encerrar_se_vencido(db: Session, contrato: Contrato) -> Contrato:
    """Marca como encerrado se data_fim já passou e está ativo."""
    if (
        contrato.status == StatusContrato.ativo
        and contrato.data_fim < date.today()
    ):
        contrato.status = StatusContrato.encerrado
        db.commit()
        db.refresh(contrato)
    return contrato


def to_out_dict(c: Contrato, *, role: str = "admin") -> dict:
    """Saída JSON do contrato.

    `pdf_url` aponta para o endpoint backend autenticado de download — não
    expõe URL pública do GCS. O frontend faz fetch com Bearer.
    """
    if c.pdf_path:
        from app.core.config import settings as _s

        prefix = "/admin" if role == "admin" else ""
        pdf_url = (
            f"{_s.PUBLIC_BASE_URL.rstrip('/')}{_s.API_V1_PREFIX}"
            f"{prefix}/contratos/{c.id}/download"
        )
    else:
        pdf_url = None

    return {
        "id": c.id,
        "cliente_id": c.cliente_id,
        "cliente_nome_empresa": c.cliente.nome_empresa if c.cliente else None,
        "admin_id": c.admin_id,
        "admin_nome": c.admin.nome if c.admin else None,
        "titulo": c.titulo,
        "escopo": c.escopo or [],
        "descricao": c.descricao,
        "valor_mensal": c.valor_mensal,
        "duracao_meses": c.duracao_meses,
        "data_inicio": c.data_inicio,
        "data_fim": c.data_fim,
        "status": c.status,
        "pdf_url": pdf_url,
        "pdf_nome_original": c.pdf_nome_original,
        "assinado_em_externo": c.assinado_em_externo,
        "cancelado_em": c.cancelado_em,
        "motivo_cancelamento": c.motivo_cancelamento,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


def cliente_do_usuario(db: Session, usuario_id: UUID) -> Cliente | None:
    return db.scalar(select(Cliente).where(Cliente.usuario_id == usuario_id))
