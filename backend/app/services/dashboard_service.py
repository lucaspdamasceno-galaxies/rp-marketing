from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.models.postagem import Postagem
from app.schemas.dashboard import DashboardOut, DashboardResumo, PontoCrescimento
from app.schemas.postagem import PostagemOut


def montar_dashboard(db: Session, cliente_id: UUID) -> DashboardOut:
    agora = datetime.now(timezone.utc)
    inicio = agora - timedelta(days=30)

    total_postagens = db.scalar(
        select(func.count(Postagem.id)).where(Postagem.cliente_id == cliente_id)
    ) or 0

    agg = db.execute(
        select(
            func.coalesce(func.sum(Postagem.curtidas), 0),
            func.coalesce(func.sum(Postagem.comentarios), 0),
            func.coalesce(func.sum(Postagem.alcance), 0),
        ).where(Postagem.cliente_id == cliente_id)
    ).one()
    total_curtidas, total_comentarios, total_alcance = (int(agg[0]), int(agg[1]), int(agg[2]))

    # followers ainda não tem fonte: placeholder em 0 até integração Instagram
    followers = 0

    crescimento: list[PontoCrescimento] = [
        PontoCrescimento(data=(inicio + timedelta(days=i)).date(), followers=0)
        for i in range(31)
    ]

    ultimas = db.scalars(
        select(Postagem)
        .where(Postagem.cliente_id == cliente_id)
        .order_by(desc(Postagem.data_publicacao))
        .limit(5)
    ).all()

    return DashboardOut(
        resumo=DashboardResumo(
            followers=followers,
            total_curtidas=total_curtidas,
            total_comentarios=total_comentarios,
            total_alcance=total_alcance,
            total_postagens=total_postagens,
        ),
        crescimento=crescimento,
        ultimas_postagens=[PostagemOut.model_validate(p) for p in ultimas],
    )
