from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, UploadFile
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app.models.aprovacao import (
    Aprovacao,
    AprovacaoComentario,
    AprovacaoMidia,
    StatusAprovacao,
)
from app.models.cliente import Cliente
from app.models.usuario import Usuario
from app.schemas.aprovacao import AprovacaoCreate, AprovacaoUpdate
from app.services import storage_service


def _base_query():
    return select(Aprovacao).options(
        joinedload(Aprovacao.cliente),
        joinedload(Aprovacao.admin),
        joinedload(Aprovacao.midias),
    )


def listar_admin(
    db: Session,
    cliente_id: UUID | None,
    status_texto: StatusAprovacao | None,
    status_arte: StatusAprovacao | None,
    postado: bool | None,
    page: int,
    page_size: int,
) -> tuple[list[Aprovacao], int]:
    base = _base_query()
    if cliente_id:
        base = base.where(Aprovacao.cliente_id == cliente_id)
    if status_texto:
        base = base.where(Aprovacao.status_texto == status_texto)
    if status_arte:
        base = base.where(Aprovacao.status_arte == status_arte)
    if postado is True:
        base = base.where(Aprovacao.postado_em.is_not(None))
    elif postado is False:
        base = base.where(Aprovacao.postado_em.is_(None))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(Aprovacao.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return list(items), total


def listar_cliente(
    db: Session,
    cliente_id: UUID,
    status_texto: StatusAprovacao | None,
    status_arte: StatusAprovacao | None,
    postado: bool | None,
    page: int,
    page_size: int,
) -> tuple[list[Aprovacao], int]:
    base = _base_query().where(Aprovacao.cliente_id == cliente_id)
    if status_texto:
        base = base.where(Aprovacao.status_texto == status_texto)
    if status_arte:
        base = base.where(Aprovacao.status_arte == status_arte)
    if postado is True:
        base = base.where(Aprovacao.postado_em.is_not(None))
    elif postado is False:
        base = base.where(Aprovacao.postado_em.is_(None))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    stmt = (
        base.order_by(desc(Aprovacao.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = db.scalars(stmt).unique().all()
    return list(items), total


def buscar(db: Session, aprovacao_id: UUID) -> Aprovacao | None:
    stmt = _base_query().where(Aprovacao.id == aprovacao_id)
    return db.scalars(stmt).unique().one_or_none()


def criar(db: Session, payload: AprovacaoCreate, admin_id: UUID) -> Aprovacao:
    aprovacao = Aprovacao(
        cliente_id=payload.cliente_id,
        admin_id=admin_id,
        titulo=payload.titulo,
        tipo=payload.tipo,
        legenda=payload.legenda,
        data_agendada=payload.data_agendada,
        status_texto=StatusAprovacao.pendente,
        status_arte=StatusAprovacao.pendente,
    )
    db.add(aprovacao)
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def atualizar(
    db: Session, aprovacao: Aprovacao, payload: AprovacaoUpdate
) -> Aprovacao:
    if payload.titulo is not None:
        aprovacao.titulo = payload.titulo
    if payload.tipo is not None:
        aprovacao.tipo = payload.tipo
    if payload.legenda is not None:
        aprovacao.legenda = payload.legenda
    if payload.data_agendada is not None:
        aprovacao.data_agendada = payload.data_agendada
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def decidir_texto(
    db: Session,
    aprovacao: Aprovacao,
    novo_status: StatusAprovacao,
    cliente_usuario_id: UUID,
    comentario: str | None,
) -> Aprovacao:
    aprovacao.status_texto = novo_status
    aprovacao.decidido_texto_em = datetime.now(timezone.utc)
    db.commit()
    if comentario:
        adicionar_comentario(db, aprovacao, cliente_usuario_id, comentario)
    db.refresh(aprovacao)
    return aprovacao


def decidir_arte(
    db: Session,
    aprovacao: Aprovacao,
    novo_status: StatusAprovacao,
    cliente_usuario_id: UUID,
    comentario: str | None,
) -> Aprovacao:
    aprovacao.status_arte = novo_status
    aprovacao.decidido_arte_em = datetime.now(timezone.utc)
    db.commit()
    if comentario:
        adicionar_comentario(db, aprovacao, cliente_usuario_id, comentario)
    db.refresh(aprovacao)
    return aprovacao


def marcar_postado(db: Session, aprovacao: Aprovacao) -> Aprovacao:
    if (
        aprovacao.status_texto != StatusAprovacao.aprovado
        or aprovacao.status_arte != StatusAprovacao.aprovado
    ):
        raise HTTPException(
            status_code=409,
            detail="só é possível marcar como postado quando texto e arte estiverem aprovados",
        )
    aprovacao.postado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def desfazer_postado(db: Session, aprovacao: Aprovacao) -> Aprovacao:
    aprovacao.postado_em = None
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def setar_status_admin(
    db: Session,
    aprovacao: Aprovacao,
    status_texto: StatusAprovacao | None,
    status_arte: StatusAprovacao | None,
) -> Aprovacao:
    """Override admin dos trilhos — não exige comentário e não aciona regras do cliente."""
    if status_texto is not None and status_texto != aprovacao.status_texto:
        aprovacao.status_texto = status_texto
        aprovacao.decidido_texto_em = (
            datetime.now(timezone.utc)
            if status_texto != StatusAprovacao.pendente
            else None
        )
    if status_arte is not None and status_arte != aprovacao.status_arte:
        aprovacao.status_arte = status_arte
        aprovacao.decidido_arte_em = (
            datetime.now(timezone.utc)
            if status_arte != StatusAprovacao.pendente
            else None
        )
    db.commit()
    db.refresh(aprovacao)
    return aprovacao


def remover(db: Session, aprovacao: Aprovacao) -> None:
    paths = [m.path for m in aprovacao.midias]
    for c in aprovacao.comentarios:
        if c.anexos_paths:
            paths.extend(p for p in c.anexos_paths.split("\n") if p)
    db.delete(aprovacao)
    db.commit()
    for p in paths:
        storage_service.remover(p)


# -------- Mídias --------


async def adicionar_midias(
    db: Session, aprovacao: Aprovacao, files: list[UploadFile]
) -> list[AprovacaoMidia]:
    if not files:
        raise HTTPException(status_code=422, detail="nenhuma mídia enviada")
    proxima_ordem = (
        max((m.ordem for m in aprovacao.midias), default=-1) + 1
    )
    novas: list[AprovacaoMidia] = []
    for idx, upload in enumerate(files):
        info = await storage_service.salvar_upload(
            upload,
            kind="aprovacoes",
            owner_id=aprovacao.id,
            allowed_mimes=storage_service.MIDIA_MIMES,
        )
        midia = AprovacaoMidia(
            aprovacao_id=aprovacao.id,
            ordem=proxima_ordem + idx,
            path=info["path"],
            nome_original=info["nome_original"],
            mime_type=info["mime_type"],
            tamanho_bytes=info["tamanho_bytes"],
        )
        db.add(midia)
        novas.append(midia)
    db.commit()
    for m in novas:
        db.refresh(m)
    return novas


def remover_midia(db: Session, midia: AprovacaoMidia) -> None:
    path = midia.path
    db.delete(midia)
    db.commit()
    storage_service.remover(path)


def buscar_midia(db: Session, midia_id: UUID) -> AprovacaoMidia | None:
    return db.get(AprovacaoMidia, midia_id)


# -------- Comentários --------


def adicionar_comentario(
    db: Session,
    aprovacao: Aprovacao,
    autor_id: UUID,
    mensagem: str,
    anexos_paths: list[str] | None = None,
) -> AprovacaoComentario:
    comentario = AprovacaoComentario(
        aprovacao_id=aprovacao.id,
        autor_id=autor_id,
        mensagem=mensagem,
        anexos_paths="\n".join(anexos_paths) if anexos_paths else None,
    )
    db.add(comentario)
    db.commit()
    db.refresh(comentario)
    return comentario


async def adicionar_comentario_com_anexos(
    db: Session,
    aprovacao: Aprovacao,
    autor_id: UUID,
    mensagem: str,
    files: list[UploadFile],
) -> AprovacaoComentario:
    paths: list[str] = []
    for upload in files:
        info = await storage_service.salvar_upload(
            upload,
            kind="aprovacoes",
            owner_id=aprovacao.id,
            allowed_mimes=storage_service.MIDIA_MIMES,
        )
        paths.append(info["path"])
    return adicionar_comentario(db, aprovacao, autor_id, mensagem, paths)


def listar_comentarios(
    db: Session, aprovacao_id: UUID
) -> list[AprovacaoComentario]:
    stmt = (
        select(AprovacaoComentario)
        .options(joinedload(AprovacaoComentario.autor))
        .where(AprovacaoComentario.aprovacao_id == aprovacao_id)
        .order_by(AprovacaoComentario.created_at.asc())
    )
    return list(db.scalars(stmt).all())


def total_comentarios(db: Session, aprovacao_id: UUID) -> int:
    return (
        db.scalar(
            select(func.count(AprovacaoComentario.id)).where(
                AprovacaoComentario.aprovacao_id == aprovacao_id
            )
        )
        or 0
    )


# -------- Serializers --------


def midia_to_out(m: AprovacaoMidia) -> dict:
    return {
        "id": m.id,
        "ordem": m.ordem,
        "url": storage_service.url_publica(m.path),
        "mime_type": m.mime_type,
        "tamanho_bytes": m.tamanho_bytes,
        "nome_original": m.nome_original,
        "created_at": m.created_at,
    }


def comentario_to_out(c: AprovacaoComentario) -> dict:
    paths = [p for p in (c.anexos_paths or "").split("\n") if p]
    return {
        "id": c.id,
        "aprovacao_id": c.aprovacao_id,
        "autor_id": c.autor_id,
        "autor_nome": c.autor.nome if c.autor else None,
        "autor_role": c.autor.role.value if c.autor else None,
        "mensagem": c.mensagem,
        "anexos_urls": [storage_service.url_publica(p) for p in paths],
        "created_at": c.created_at,
    }


def to_out_dict(db: Session, a: Aprovacao) -> dict:
    return {
        "id": a.id,
        "cliente_id": a.cliente_id,
        "cliente_nome_empresa": a.cliente.nome_empresa if a.cliente else None,
        "admin_id": a.admin_id,
        "admin_nome": a.admin.nome if a.admin else None,
        "titulo": a.titulo,
        "tipo": a.tipo,
        "legenda": a.legenda,
        "data_agendada": a.data_agendada,
        "status_texto": a.status_texto,
        "status_arte": a.status_arte,
        "decidido_texto_em": a.decidido_texto_em,
        "decidido_arte_em": a.decidido_arte_em,
        "postado_em": a.postado_em,
        "midias": [midia_to_out(m) for m in a.midias],
        "total_comentarios": total_comentarios(db, a.id),
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


def cliente_do_usuario(db: Session, usuario_id: UUID) -> Cliente | None:
    return db.scalar(select(Cliente).where(Cliente.usuario_id == usuario_id))


__all__ = [
    "listar_admin",
    "listar_cliente",
    "buscar",
    "criar",
    "atualizar",
    "decidir_texto",
    "decidir_arte",
    "marcar_postado",
    "remover",
    "adicionar_midias",
    "remover_midia",
    "buscar_midia",
    "adicionar_comentario",
    "adicionar_comentario_com_anexos",
    "listar_comentarios",
    "total_comentarios",
    "midia_to_out",
    "comentario_to_out",
    "to_out_dict",
    "cliente_do_usuario",
    "Usuario",
]
