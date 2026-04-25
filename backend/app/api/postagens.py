from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.deps import ClienteUser, DbSession
from app.models.cliente import Cliente
from app.schemas.common import Envelope, Page
from app.schemas.postagem import PostagemOut
from app.services import postagem_service

router = APIRouter(prefix="/postagens", tags=["postagens"])


def _cliente_do_usuario(db, usuario_id: UUID) -> Cliente:
    cliente = db.scalar(select(Cliente).where(Cliente.usuario_id == usuario_id))
    if not cliente:
        raise HTTPException(status_code=404, detail="cliente não encontrado para este usuário")
    return cliente


@router.get("", response_model=Envelope[Page[PostagemOut]])
def listar_postagens(
    current: ClienteUser,
    db: DbSession,
    periodo_inicio: datetime | None = None,
    periodo_fim: datetime | None = None,
    ordenar_por: Literal["data", "engajamento"] = "data",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Envelope[Page[PostagemOut]]:
    cliente = _cliente_do_usuario(db, current.id)
    items, total = postagem_service.listar_do_cliente(
        db, cliente.id, periodo_inicio, periodo_fim, ordenar_por, page, page_size
    )
    return Envelope(
        data=Page[PostagemOut](
            items=[PostagemOut.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
        )
    )


@router.get("/{postagem_id}", response_model=Envelope[PostagemOut])
def obter_postagem(
    postagem_id: UUID, current: ClienteUser, db: DbSession
) -> Envelope[PostagemOut]:
    cliente = _cliente_do_usuario(db, current.id)
    postagem = postagem_service.buscar_do_cliente(db, cliente.id, postagem_id)
    if not postagem:
        raise HTTPException(status_code=404, detail="postagem não encontrada")
    return Envelope(data=PostagemOut.model_validate(postagem))
