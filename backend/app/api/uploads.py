"""Serve arquivos do diretório de uploads.

Requer usuário autenticado. Autorização granular (cliente só pode ver seus próprios
arquivos) é simplificada: qualquer usuário autenticado consegue ler. Caminhos são
imprevisíveis (token aleatório no nome) então o vazamento exige enumeração ativa.
"""
from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser
from app.services import storage_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/{kind}/{owner_id}/{nome}")
def servir_upload(
    kind: str,
    owner_id: str,
    nome: str,
    _: CurrentUser,
):
    from fastapi.responses import FileResponse

    rel = f"{kind}/{owner_id}/{nome}"
    caminho = storage_service.caminho_absoluto(rel)
    if not caminho.exists() or not caminho.is_file():
        raise HTTPException(status_code=404, detail="arquivo não encontrado")
    return FileResponse(caminho)
