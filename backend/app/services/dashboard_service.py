from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.models.cliente import Cliente
from app.models.followers_snapshot import FollowersSnapshot
from app.models.metricas_mensais import MetricasMensais
from app.models.postagem import Postagem
from app.schemas.dashboard import (
    CampoCustomizadoOut,
    DashboardOut,
    DashboardResumo,
    DeltaMetrica,
    PontoCrescimento,
)
from app.schemas.postagem import PostagemOut


def _delta(atual: int, anterior: int) -> DeltaMetrica:
    diff = atual - anterior
    if anterior == 0:
        pct = 100.0 if diff > 0 else 0.0
    else:
        pct = (diff / anterior) * 100
    return DeltaMetrica(absoluto=diff, percentual=round(pct, 2))


def _resumo_de_postagens(
    db: Session, cliente_id: UUID, inicio: datetime, fim: datetime
) -> tuple[int, int, int, int]:
    total_postagens = (
        db.scalar(
            select(func.count(Postagem.id)).where(
                Postagem.cliente_id == cliente_id,
                Postagem.data_publicacao >= inicio,
                Postagem.data_publicacao <= fim,
            )
        )
        or 0
    )
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
    return total_postagens, int(agg[0]), int(agg[1]), int(agg[2])


def _followers_no_fim_do_periodo(
    db: Session, cliente_id: UUID, fim: datetime
) -> int:
    snap = db.scalar(
        select(FollowersSnapshot)
        .where(
            FollowersSnapshot.cliente_id == cliente_id,
            FollowersSnapshot.coletado_em <= fim,
        )
        .order_by(desc(FollowersSnapshot.coletado_em))
        .limit(1)
    )
    return snap.followers_count if snap else 0


def _metricas_que_sobrepoem(
    db: Session, cliente_id: UUID, inicio: datetime, fim: datetime
) -> list[MetricasMensais]:
    inicio_d = inicio.date()
    fim_d = fim.date()
    return list(
        db.scalars(
            select(MetricasMensais)
            .where(
                MetricasMensais.cliente_id == cliente_id,
                MetricasMensais.data_fim >= inicio_d,
                MetricasMensais.data_inicio <= fim_d,
            )
            .order_by(asc(MetricasMensais.data_inicio))
        ).all()
    )


def montar_dashboard(
    db: Session,
    cliente_id: UUID,
    periodo_inicio: datetime | None = None,
    periodo_fim: datetime | None = None,
) -> DashboardOut:
    agora = datetime.now(timezone.utc)
    fim = periodo_fim or agora
    inicio = periodo_inicio or (fim - timedelta(days=30))
    duracao = fim - inicio
    inicio_anterior = inicio - duracao
    fim_anterior = inicio

    metricas_periodo = _metricas_que_sobrepoem(db, cliente_id, inicio, fim)

    if metricas_periodo:
        # ---------- modo MANUAL: cada registro é um snapshot independente ----------
        # Resumo = valores do registro MAIS RECENTE no período
        # Delta = comparação vs registro IMEDIATAMENTE ANTERIOR (mesmo fora do filtro)
        latest = metricas_periodo[-1]
        followers = latest.seguidores
        total_curtidas = latest.curtidas
        total_comentarios = latest.comentarios
        total_alcance = latest.alcance
        total_postagens = latest.total_postagens

        # Gráfico de crescimento: todos os registros que sobrepõem o filtro
        crescimento = [
            PontoCrescimento(data=m.data_fim, followers=m.seguidores)
            for m in metricas_periodo
        ]

        # Campos customizados: do registro mais recente
        campos_customizados = [
            CampoCustomizadoOut(
                chave=c.get("chave", ""),
                label=c.get("label") or c.get("chave", ""),
                valor=float(c.get("valor", 0)),
                sufixo=c.get("sufixo"),
            )
            for c in (latest.campos_customizados or [])
            if c.get("chave")
        ]

        # Registro imediatamente anterior ao mais recente (independente do filtro)
        prior = db.scalar(
            select(MetricasMensais)
            .where(
                MetricasMensais.cliente_id == cliente_id,
                MetricasMensais.data_inicio < latest.data_inicio,
            )
            .order_by(desc(MetricasMensais.data_inicio))
            .limit(1)
        )
        if prior:
            ant_followers = prior.seguidores
            ant_curtidas = prior.curtidas
            ant_comentarios = prior.comentarios
            ant_alcance = prior.alcance
            ant_postagens = prior.total_postagens
        else:
            ant_followers = ant_curtidas = ant_comentarios = ant_alcance = ant_postagens = 0
        fonte = "manual"
    else:
        # ---------- modo AUTO: usa Postagem + FollowersSnapshot ----------
        total_postagens, total_curtidas, total_comentarios, total_alcance = (
            _resumo_de_postagens(db, cliente_id, inicio, fim)
        )
        followers = _followers_no_fim_do_periodo(db, cliente_id, fim)

        snapshots = db.scalars(
            select(FollowersSnapshot)
            .where(
                FollowersSnapshot.cliente_id == cliente_id,
                FollowersSnapshot.coletado_em >= inicio,
                FollowersSnapshot.coletado_em <= fim,
            )
            .order_by(asc(FollowersSnapshot.coletado_em))
        ).all()
        crescimento = [
            PontoCrescimento(data=s.coletado_em.date(), followers=s.followers_count)
            for s in snapshots
        ]
        if not crescimento and followers:
            crescimento = [PontoCrescimento(data=fim.date(), followers=followers)]

        ant_postagens, ant_curtidas, ant_comentarios, ant_alcance = (
            _resumo_de_postagens(db, cliente_id, inicio_anterior, fim_anterior)
        )
        ant_followers = _followers_no_fim_do_periodo(db, cliente_id, fim_anterior)
        campos_customizados = []
        fonte = "auto"

    ultimas = db.scalars(
        select(Postagem)
        .where(
            Postagem.cliente_id == cliente_id,
            Postagem.data_publicacao >= inicio,
            Postagem.data_publicacao <= fim,
        )
        .order_by(desc(Postagem.data_publicacao))
        .limit(5)
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
        deltas={
            "followers": _delta(followers, ant_followers),
            "curtidas": _delta(total_curtidas, ant_curtidas),
            "comentarios": _delta(total_comentarios, ant_comentarios),
            "alcance": _delta(total_alcance, ant_alcance),
            "postagens": _delta(total_postagens, ant_postagens),
        },
        crescimento=crescimento,
        ultimas_postagens=[PostagemOut.model_validate(p) for p in ultimas],
        last_sync_at=last_sync_at,
        campos_customizados=campos_customizados,
        fonte=fonte,
    )
