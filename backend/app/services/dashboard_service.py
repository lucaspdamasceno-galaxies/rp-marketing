from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.followers_snapshot import FollowersSnapshot
from app.models.postagem import Postagem
from app.schemas.dashboard import DashboardOut, DashboardResumo, PontoCrescimento
from app.schemas.postagem import PostagemOut


def montar_dashboard(
    db: Session,
    cliente_id: UUID,
    periodo_inicio: datetime | None = None,
    periodo_fim: datetime | None = None,
) -> DashboardOut:
    agora = datetime.now(timezone.utc)
    fim = periodo_fim or agora
    inicio = periodo_inicio or (fim - timedelta(days=30))

    base_post = select(Postagem).where(
        Postagem.cliente_id == cliente_id,
        Postagem.data_publicacao >= inicio,
        Postagem.data_publicacao <= fim,
    )

    total_postagens = db.scalar(
        select(func.count(Postagem.id)).where(
            Postagem.cliente_id == cliente_id,
            Postagem.data_publicacao >= inicio,
            Postagem.data_publicacao <= fim,
        )
    ) or 0

    agg = db.execute(
        select(
            func.coalesce(func.sum(Postagem.curtidas), 0),
            func.coalesce(func.sum(Postagem.comentarios), 0),
            func.coalesce(func.sum(Postagem.alcance), 0),
        ).where(
            Postagem.cliente_id == cliente_id,
            Postagem.data_publicacao >= inicio,
            Postagem.data_publicacao <= fim,
        )
    ).one()
    total_curtidas, total_comentarios, total_alcance = (int(agg[0]), int(agg[1]), int(agg[2]))

    snapshot_atual = db.scalar(
        select(FollowersSnapshot)
        .where(
            FollowersSnapshot.cliente_id == cliente_id,
            FollowersSnapshot.coletado_em <= fim,
        )
        .order_by(desc(FollowersSnapshot.coletado_em))
        .limit(1)
    )
    followers = snapshot_atual.followers_count if snapshot_atual else 0

    snapshots = db.scalars(
        select(FollowersSnapshot)
        .where(
            FollowersSnapshot.cliente_id == cliente_id,
            FollowersSnapshot.coletado_em >= inicio,
            FollowersSnapshot.coletado_em <= fim,
        )
        .order_by(asc(FollowersSnapshot.coletado_em))
    ).all()

    crescimento: list[PontoCrescimento] = [
        PontoCrescimento(data=s.coletado_em.date(), followers=s.followers_count)
        for s in snapshots
    ]
    if not crescimento and snapshot_atual:
        crescimento = [
            PontoCrescimento(
                data=snapshot_atual.coletado_em.date(),
                followers=snapshot_atual.followers_count,
            )
        ]

    ultimas = db.scalars(
        base_post.order_by(desc(Postagem.data_publicacao)).limit(5)
    ).all()

    cliente = db.get(Cliente, cliente_id)
    last_sync_at = cliente.last_sync_at if cliente else None

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
        last_sync_at=last_sync_at,
    )
