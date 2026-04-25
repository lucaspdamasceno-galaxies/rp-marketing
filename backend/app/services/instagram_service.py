from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.cliente import Cliente
from app.models.postagem import Postagem, TipoPostagem

GRAPH_BASE = "https://graph.facebook.com/v21.0"
OAUTH_TOKEN_URL = f"{GRAPH_BASE}/oauth/access_token"


class InstagramError(Exception):
    pass


def trocar_code_por_token(code: str, redirect_uri: str | None = None) -> dict:
    if not settings.INSTAGRAM_APP_ID or not settings.INSTAGRAM_APP_SECRET:
        raise InstagramError("INSTAGRAM_APP_ID/SECRET não configurados")

    params = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "redirect_uri": redirect_uri or settings.INSTAGRAM_REDIRECT_URI,
        "code": code,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(OAUTH_TOKEN_URL, params=params)
        if resp.status_code != 200:
            raise InstagramError(f"falha ao trocar code: {resp.text}")
        return resp.json()


def trocar_por_token_longa_duracao(short_token: str) -> dict:
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.INSTAGRAM_APP_ID,
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "fb_exchange_token": short_token,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(OAUTH_TOKEN_URL, params=params)
        if resp.status_code != 200:
            raise InstagramError(f"falha ao gerar token longo: {resp.text}")
        return resp.json()


def buscar_instagram_account_id(access_token: str) -> str:
    """Descobre o IG Business Account vinculado à página do Facebook do usuário."""
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(
            f"{GRAPH_BASE}/me/accounts",
            params={"access_token": access_token},
        )
        if resp.status_code != 200:
            raise InstagramError(f"falha ao listar páginas: {resp.text}")
        pages = resp.json().get("data", [])
        if not pages:
            raise InstagramError("nenhuma página do Facebook encontrada")

        for page in pages:
            r = client.get(
                f"{GRAPH_BASE}/{page['id']}",
                params={
                    "fields": "instagram_business_account",
                    "access_token": access_token,
                },
            )
            if r.status_code == 200:
                ig = r.json().get("instagram_business_account")
                if ig and ig.get("id"):
                    return ig["id"]
        raise InstagramError("nenhuma conta Instagram Business vinculada")


def conectar_cliente(
    db: Session, cliente: Cliente, code: str, redirect_uri: str | None
) -> Cliente:
    short = trocar_code_por_token(code, redirect_uri)
    short_token = short.get("access_token")
    if not short_token:
        raise InstagramError("access_token ausente na resposta do OAuth")

    longo = trocar_por_token_longa_duracao(short_token)
    access_token = longo.get("access_token") or short_token
    expires_in = longo.get("expires_in") or short.get("expires_in")

    instagram_account_id = buscar_instagram_account_id(access_token)

    cliente.access_token = access_token
    cliente.instagram_account_id = instagram_account_id
    cliente.token_expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))
        if expires_in
        else None
    )
    db.commit()
    db.refresh(cliente)
    return cliente


def sincronizar_postagens(db: Session, cliente: Cliente, limit: int = 25) -> int:
    if not cliente.access_token or not cliente.instagram_account_id:
        raise InstagramError("cliente sem Instagram conectado")

    fields = (
        "id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,"
        "like_count,comments_count,insights.metric(reach,impressions,video_views)"
    )
    with httpx.Client(timeout=20.0) as client:
        resp = client.get(
            f"{GRAPH_BASE}/{cliente.instagram_account_id}/media",
            params={
                "fields": fields,
                "limit": limit,
                "access_token": cliente.access_token,
            },
        )
        if resp.status_code != 200:
            raise InstagramError(f"falha ao buscar mídias: {resp.text}")
        data = resp.json().get("data", [])

    salvas = 0
    for item in data:
        media_id = item.get("id")
        if not media_id:
            continue

        existente = (
            db.query(Postagem)
            .filter(Postagem.instagram_media_id == media_id)
            .one_or_none()
        )

        media_type = (item.get("media_type") or "IMAGE").upper()
        try:
            tipo = TipoPostagem(media_type)
        except ValueError:
            tipo = TipoPostagem.IMAGE

        insights = {i["name"]: i["values"][0]["value"] for i in (item.get("insights", {}).get("data") or [])}

        valores = {
            "cliente_id": cliente.id,
            "instagram_media_id": media_id,
            "tipo": tipo,
            "url_midia": item.get("media_url") or item.get("thumbnail_url") or "",
            "permalink": item.get("permalink"),
            "legenda": item.get("caption"),
            "curtidas": int(item.get("like_count") or 0),
            "comentarios": int(item.get("comments_count") or 0),
            "visualizacoes": int(insights.get("video_views") or 0),
            "alcance": int(insights.get("reach") or 0),
            "impressoes": int(insights.get("impressions") or 0),
            "data_publicacao": _parse_iso(item.get("timestamp")),
        }

        if existente:
            for k, v in valores.items():
                setattr(existente, k, v)
        else:
            db.add(Postagem(**valores))
            salvas += 1

    db.commit()
    return salvas


def _parse_iso(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
