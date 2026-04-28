from datetime import date
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.cliente import Cliente
from app.models.relatorio_trafego import RelatorioTrafego
from app.schemas.relatorio_trafego import (
    RelatorioTrafegoComparacaoItem,
    RelatorioTrafegoDiff,
    RelatorioTrafegoUpdate,
)
from app.services import pdf_parser_service, storage_service


def _base_query():
    return select(RelatorioTrafego).options(
        joinedload(RelatorioTrafego.cliente),
        joinedload(RelatorioTrafego.admin),
    )


def buscar(db: Session, relatorio_id: UUID) -> RelatorioTrafego | None:
    return db.scalars(
        _base_query().where(RelatorioTrafego.id == relatorio_id)
    ).unique().one_or_none()


def listar_por_cliente(
    db: Session, cliente_id: UUID, page: int, page_size: int
) -> tuple[list[RelatorioTrafego], int]:
    base = _base_query().where(RelatorioTrafego.cliente_id == cliente_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(RelatorioTrafego.periodo_inicio))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(stmt).unique().all()), total


def listar_admin(
    db: Session,
    cliente_id: UUID | None,
    page: int,
    page_size: int,
) -> tuple[list[RelatorioTrafego], int]:
    base = _base_query()
    if cliente_id:
        base = base.where(RelatorioTrafego.cliente_id == cliente_id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(RelatorioTrafego.periodo_inicio))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(stmt).unique().all()), total


async def criar_via_upload(
    db: Session,
    cliente_id: UUID,
    admin_id: UUID,
    upload: UploadFile,
    periodo_inicio_override: date | None = None,
    periodo_fim_override: date | None = None,
) -> RelatorioTrafego:
    """Faz upload do PDF, parseia, persiste o relatório.

    Se o parser não conseguir extrair o período, exige override do admin.
    """
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado")

    relatorio = RelatorioTrafego(
        cliente_id=cliente_id,
        admin_id=admin_id,
        periodo_inicio=periodo_inicio_override or date.today(),
        periodo_fim=periodo_fim_override or date.today(),
        dados={},
    )
    db.add(relatorio)
    db.flush()

    info = await storage_service.salvar_upload(
        upload,
        kind="relatorios",
        owner_id=relatorio.id,
        allowed_mimes=storage_service.PDF_MIMES,
    )
    relatorio.pdf_path = info["path"]
    relatorio.pdf_nome_original = info["nome_original"]

    try:
        pdf_bytes = storage_service.read_bytes(info["path"])
        texto_bruto, dados = pdf_parser_service.parse_relatorio(pdf_bytes)
    except Exception as exc:
        db.rollback()
        storage_service.remover(info["path"])
        raise HTTPException(
            status_code=422, detail=f"falha ao parsear PDF: {exc}"
        ) from exc

    relatorio.texto_bruto = texto_bruto
    relatorio.dados = dados

    if not periodo_inicio_override or not periodo_fim_override:
        periodo = dados.get("periodo") if isinstance(dados, dict) else None
        if periodo:
            from datetime import date as _date

            try:
                if not periodo_inicio_override:
                    relatorio.periodo_inicio = _date.fromisoformat(periodo["inicio"])
                if not periodo_fim_override:
                    relatorio.periodo_fim = _date.fromisoformat(periodo["fim"])
            except (KeyError, ValueError):
                pass

    if relatorio.periodo_inicio == relatorio.periodo_fim == date.today() and (
        not periodo_inicio_override or not periodo_fim_override
    ):
        # Não conseguimos identificar o período e admin não passou override.
        db.rollback()
        storage_service.remover(info["path"])
        raise HTTPException(
            status_code=422,
            detail="não foi possível identificar o período no PDF — informe periodo_inicio e periodo_fim na requisição",
        )

    db.commit()
    db.refresh(relatorio)
    return relatorio


def atualizar(
    db: Session, relatorio: RelatorioTrafego, payload: RelatorioTrafegoUpdate
) -> RelatorioTrafego:
    if payload.periodo_inicio is not None:
        relatorio.periodo_inicio = payload.periodo_inicio
    if payload.periodo_fim is not None:
        relatorio.periodo_fim = payload.periodo_fim
    if payload.dados is not None:
        relatorio.dados = payload.dados
    if payload.observacoes is not None:
        relatorio.observacoes = payload.observacoes
    db.commit()
    db.refresh(relatorio)
    return relatorio


def remover(db: Session, relatorio: RelatorioTrafego) -> None:
    pdf = relatorio.pdf_path
    db.delete(relatorio)
    db.commit()
    if pdf:
        storage_service.remover(pdf)


# -------- Serializers / comparação --------


def to_out_dict(r: RelatorioTrafego) -> dict:
    return {
        "id": r.id,
        "cliente_id": r.cliente_id,
        "cliente_nome_empresa": r.cliente.nome_empresa if r.cliente else None,
        "admin_id": r.admin_id,
        "admin_nome": r.admin.nome if r.admin else None,
        "periodo_inicio": r.periodo_inicio,
        "periodo_fim": r.periodo_fim,
        "pdf_url": storage_service.url_publica(r.pdf_path) if r.pdf_path else None,
        "pdf_nome_original": r.pdf_nome_original,
        "dados": r.dados or {},
        "observacoes": r.observacoes,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


def to_comparacao_item(r: RelatorioTrafego) -> RelatorioTrafegoComparacaoItem:
    g = (r.dados or {}).get("google_ads") or {}
    m = (r.dados or {}).get("meta_ads") or {}
    return RelatorioTrafegoComparacaoItem(
        id=r.id,
        periodo_inicio=r.periodo_inicio,
        periodo_fim=r.periodo_fim,
        google_custo=g.get("custo"),
        google_impressoes=g.get("impressoes"),
        google_cliques=g.get("cliques"),
        google_ctr=g.get("ctr"),
        google_cpc=g.get("cpc_medio"),
        meta_investido=m.get("valor_investido"),
        meta_alcance=m.get("alcance"),
        meta_impressoes=m.get("impressoes"),
        meta_cliques_link=m.get("cliques_link"),
        meta_ctr_link=m.get("ctr_link"),
        meta_cpc=m.get("cpc_medio"),
        meta_conversas=m.get("conversas"),
    )


def comparar(
    db: Session, atual_id: UUID, anterior_id: UUID
) -> RelatorioTrafegoDiff:
    atual = buscar(db, atual_id)
    anterior = buscar(db, anterior_id)
    if not atual or not anterior:
        raise HTTPException(status_code=404, detail="relatório não encontrado")
    if atual.cliente_id != anterior.cliente_id:
        raise HTTPException(
            status_code=409,
            detail="só é possível comparar relatórios do mesmo cliente",
        )
    a = to_comparacao_item(atual)
    b = to_comparacao_item(anterior)

    def diff(x, y):
        if x is None or y is None:
            return None
        return x - y

    deltas = {
        campo: diff(getattr(a, campo), getattr(b, campo))
        for campo in (
            "google_custo",
            "google_impressoes",
            "google_cliques",
            "google_ctr",
            "google_cpc",
            "meta_investido",
            "meta_alcance",
            "meta_impressoes",
            "meta_cliques_link",
            "meta_ctr_link",
            "meta_cpc",
            "meta_conversas",
        )
    }
    return RelatorioTrafegoDiff(anterior=b, atual=a, deltas=deltas)
