"""Armazenamento de arquivos.

Dois buckets em produção:
  - **Público** (`GCS_BUCKET`): mídias de aprovações e PDFs de relatórios. URLs
    diretas (`storage.googleapis.com/...`). Paths usam token aleatório, então
    enumeração é inviável; suficiente pra MVP.
  - **Privado** (`GCS_BUCKET_PRIVATE`): PDFs de contratos. Sem `allUsers`. O
    backend lê via SA e streama através de endpoint autenticado de download.
    Frontend nunca recebe URL pública.

Em dev (sem GCS_BUCKET), tudo cai no filesystem local servido por endpoint
autenticado em `/api/v1/uploads/...`.

Layout: `{kind}/{owner_id}/{nome-sanitizado}-{token}.{ext}`. `kind` decide o
bucket (`contratos` → privado; demais → público).
"""
from __future__ import annotations

import mimetypes
import re
import secrets
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile

from app.core.config import settings

CHUNK_SIZE = 1024 * 1024  # 1 MiB

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm"}
ALLOWED_PDF = {"application/pdf"}

MIDIA_MIMES = ALLOWED_IMAGE | ALLOWED_VIDEO
PDF_MIMES = ALLOWED_PDF

PRIVATE_KINDS = {"contratos"}


def _using_gcs() -> bool:
    return bool(settings.GCS_BUCKET)


def _is_private_kind(kind: str) -> bool:
    return kind in PRIVATE_KINDS and bool(settings.GCS_BUCKET_PRIVATE)


# =============================================================================
# GCS backend
# =============================================================================


def _gcs_client():
    from google.cloud import storage  # type: ignore
    return storage.Client()


def _bucket_for_kind(kind: str):
    name = (
        settings.GCS_BUCKET_PRIVATE if _is_private_kind(kind) else settings.GCS_BUCKET
    )
    return _gcs_client().bucket(name)


def _bucket_for_path(rel_path: str):
    """Deriva bucket a partir do path (que começa com `{kind}/...`)."""
    kind = rel_path.split("/", 1)[0] if rel_path else ""
    return _bucket_for_kind(kind)


def _gcs_url_publica(rel_path: str) -> str:
    return f"https://storage.googleapis.com/{settings.GCS_BUCKET}/{rel_path}"


# =============================================================================
# Local backend
# =============================================================================


def _root() -> Path:
    base = Path(settings.UPLOAD_DIR)
    if not base.is_absolute():
        base = Path.cwd() / base
    base.mkdir(parents=True, exist_ok=True)
    return base


def _resolve_inside(parent: Path, candidate: Path) -> Path:
    parent = parent.resolve()
    full = (parent / candidate).resolve() if not candidate.is_absolute() else candidate.resolve()
    if parent not in full.parents and full != parent:
        raise HTTPException(status_code=400, detail="caminho inválido")
    return full


# =============================================================================
# Helpers comuns
# =============================================================================


def _sanitize(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[^a-z0-9._-]+", "-", name)
    name = re.sub(r"-+", "-", name).strip("-._")
    return name or "arquivo"


def _build_path(kind: str, owner_id: UUID, original_name: str | None, content_type: str | None) -> str:
    ext = Path(original_name or "").suffix.lower()
    if not ext:
        ext = mimetypes.guess_extension(content_type or "") or ""
    nome_base = _sanitize(Path(original_name or "arquivo").stem)
    token = secrets.token_urlsafe(8)
    return f"{kind}/{owner_id}/{nome_base}-{token}{ext}"


# =============================================================================
# API pública
# =============================================================================


async def salvar_upload(
    upload: UploadFile,
    *,
    kind: str,
    owner_id: UUID,
    allowed_mimes: set[str],
) -> dict:
    if upload.content_type not in allowed_mimes:
        raise HTTPException(
            status_code=415,
            detail=f"tipo de arquivo não suportado: {upload.content_type}",
        )

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    rel_path = _build_path(kind, owner_id, upload.filename, upload.content_type)
    total = 0

    if _using_gcs():
        data = bytearray()
        try:
            while chunk := await upload.read(CHUNK_SIZE):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"arquivo excede {settings.MAX_UPLOAD_SIZE_MB}MB",
                    )
                data.extend(chunk)
        finally:
            await upload.close()
        blob = _bucket_for_kind(kind).blob(rel_path)
        blob.upload_from_string(
            bytes(data),
            content_type=upload.content_type or "application/octet-stream",
        )
    else:
        destino = _resolve_inside(_root(), Path(rel_path))
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            with destino.open("wb") as out:
                while chunk := await upload.read(CHUNK_SIZE):
                    total += len(chunk)
                    if total > max_bytes:
                        out.close()
                        destino.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=413,
                            detail=f"arquivo excede {settings.MAX_UPLOAD_SIZE_MB}MB",
                        )
                    out.write(chunk)
        finally:
            await upload.close()

    return {
        "path": rel_path,
        "mime_type": upload.content_type,
        "tamanho_bytes": total,
        "nome_original": upload.filename or rel_path.split("/")[-1],
    }


def caminho_absoluto(rel_path: str) -> Path:
    """Apenas no backend local — usado pelo endpoint que serve arquivos."""
    return _resolve_inside(_root(), Path(rel_path))


def read_bytes(rel_path: str) -> bytes:
    """Lê o conteúdo de um arquivo persistido — funciona com GCS ou local."""
    if _using_gcs():
        return _bucket_for_path(rel_path).blob(rel_path).download_as_bytes()
    return caminho_absoluto(rel_path).read_bytes()


def remover(rel_path: str) -> None:
    if _using_gcs():
        try:
            _bucket_for_path(rel_path).blob(rel_path).delete()
        except Exception:
            return
        return
    try:
        caminho_absoluto(rel_path).unlink(missing_ok=True)
    except HTTPException:
        return


def is_private(rel_path: str) -> bool:
    """True se o arquivo vive no bucket privado (contratos)."""
    kind = rel_path.split("/", 1)[0] if rel_path else ""
    return _is_private_kind(kind)


def url_publica(rel_path: str) -> str:
    """URL pública para mídias/relatórios. NÃO use pra contratos.

    GCS: URL direta no bucket público.
    Local: URL para o endpoint autenticado de uploads.
    """
    if _using_gcs():
        return _gcs_url_publica(rel_path)
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}{settings.API_V1_PREFIX}/uploads/{rel_path}"
