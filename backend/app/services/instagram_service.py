"""Integração com Instagram API (Instagram Login).

Fluxo OAuth (sem Facebook Login):
  1. Frontend redireciona o usuário para https://www.instagram.com/oauth/authorize
     com scope `instagram_business_basic,instagram_business_manage_insights`.
  2. Instagram redireciona de volta com `?code=...` no `redirect_uri` registrado.
  3. Backend troca `code` por short-lived token (1h) — recebe `access_token` + `user_id`.
  4. Backend troca short → long-lived token (60 dias).
  5. `user_id` já é o ID da conta Instagram Business — nada de Facebook Page.
"""

from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.cliente import Cliente
from app.models.postagem import Postagem, TipoPostagem

IG_OAUTH_BASE = "https://api.instagram.com"
IG_GRAPH = "https://graph.instagram.com/v22.0"
IG_GRAPH_ROOT = "https://graph.instagram.com"


class InstagramError(Exception):
    pass


def trocar_code_por_token(code: str, redirect_uri: str | None = None) -> dict:
    """Troca o `code` do OAuth por short-lived token. Retorna `access_token` + `user_id`."""
    if not settings.INSTAGRAM_APP_ID or not settings.INSTAGRAM_APP_SECRET:
        raise InstagramError("INSTAGRAM_APP_ID/SECRET não configurados")

    data = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri or settings.INSTAGRAM_REDIRECT_URI,
        "code": code,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(f"{IG_OAUTH_BASE}/oauth/access_token", data=data)
        if resp.status_code != 200:
            raise InstagramError(f"falha ao trocar code: {resp.text}")
        return resp.json()


def trocar_por_token_longa_duracao(short_token: str) -> dict:
    """Troca short-lived token (1h) por long-lived (60 dias)."""
    params = {
        "grant_type": "ig_exchange_token",
        "client_secret": settings.INSTAGRAM_APP_SECRET,
        "access_token": short_token,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(f"{IG_GRAPH_ROOT}/access_token", params=params)
        if resp.status_code != 200:
            raise InstagramError(f"falha ao gerar token longo: {resp.text}")
        return resp.json()


def conectar_cliente(
    db: Session, cliente: Cliente, code: str, redirect_uri: str | None
) -> Cliente:
    short = trocar_code_por_token(code, redirect_uri)
    short_token = short.get("access_token")
    user_id = short.get("user_id")
    if not short_token or not user_id:
        raise InstagramError("resposta de OAuth inválida (faltou access_token ou user_id)")

    longo = trocar_por_token_longa_duracao(short_token)
    access_token = longo.get("access_token") or short_token
    expires_in = longo.get("expires_in")

    cliente.access_token = access_token
    cliente.instagram_account_id = str(user_id)
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
        "id,caption,media_type,media_product_type,media_url,permalink,"
        "timestamp,thumbnail_url,like_count,comments_count"
    )
    with httpx.Client(timeout=20.0) as client:
        resp = client.get(
            f"{IG_GRAPH}/{cliente.instagram_account_id}/media",
            params={
                "fields": fields,
                "limit": limit,
                "access_token": cliente.access_token,
            },
        )
        if resp.status_code != 200:
            raise InstagramError(f"falha ao buscar mídias: {resp.text}")
        items = resp.json().get("data", [])

        salvas = 0
        for item in items:
            media_id = item.get("id")
            if not media_id:
                continue

            tipo = _resolver_tipo(item.get("media_type"), item.get("media_product_type"))
            insights = _buscar_insights(client, media_id, tipo, cliente.access_token)

            existente = (
                db.query(Postagem)
                .filter(Postagem.instagram_media_id == media_id)
                .one_or_none()
            )

            valores = {
                "cliente_id": cliente.id,
                "instagram_media_id": media_id,
                "tipo": tipo,
                "url_midia": item.get("media_url") or item.get("thumbnail_url") or "",
                "permalink": item.get("permalink"),
                "legenda": item.get("caption"),
                "curtidas": int(item.get("like_count") or 0),
                "comentarios": int(item.get("comments_count") or 0),
                "visualizacoes": int(insights.get("views") or 0),
                "alcance": int(insights.get("reach") or 0),
                "impressoes": 0,
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


def _resolver_tipo(media_type: str | None, media_product_type: str | None) -> TipoPostagem:
    if (media_product_type or "").upper() == "REELS":
        return TipoPostagem.REEL
    mt = (media_type or "IMAGE").upper()
    if mt == "VIDEO":
        return TipoPostagem.VIDEO
    if mt == "CAROUSEL_ALBUM":
        return TipoPostagem.CAROUSEL
    return TipoPostagem.IMAGE


def _buscar_insights(
    client: httpx.Client, media_id: str, tipo: TipoPostagem, token: str
) -> dict:
    """Insights são best-effort: se a API recusar uma métrica, retorna {} e segue."""
    metric = "reach,views" if tipo in (TipoPostagem.REEL, TipoPostagem.VIDEO) else "reach"
    try:
        resp = client.get(
            f"{IG_GRAPH}/{media_id}/insights",
            params={"metric": metric, "access_token": token},
        )
        if resp.status_code != 200:
            return {}
        data = resp.json().get("data", [])
        return {
            item["name"]: item["values"][0]["value"]
            for item in data
            if item.get("values")
        }
    except httpx.HTTPError:
        return {}


def _parse_iso(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
