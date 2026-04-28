"""Parser do PDF de relatório de tráfego pago (Google Ads + Meta Ads).

Baseado no template Reportei (que o cliente usa) — ver
`relatorio_de_extrema_-_jaguar_land_rover_01-04-2026_a_23-04-2026.pdf`.

A estratégia é:
  1. Extrair texto bruto via pdfplumber (uma única página geralmente).
  2. Identificar o período do relatório no cabeçalho.
  3. Capturar os blocos "Google Ads" e "Meta Ads" via regex sobre o texto.
  4. Extrair tabelas (campanhas, anúncios, regiões) via `page.extract_tables()`.

Resultado é um dict canônico salvo em `RelatorioTrafego.dados`:

```
{
  "periodo": {"inicio": "2026-04-01", "fim": "2026-04-23"},
  "google_ads": {
    "custo": 2032.19, "impressoes": 228444, "cliques": 4609,
    "ctr": 2.02, "cpc_medio": 0.44, "cpm_medio": 8.90,
    "campanhas": [{"nome": "PMAX BRANDING", "custo": 2032.19, ...}]
  },
  "meta_ads": {
    "valor_investido": 2268.81, "conversas": 121, "custo_conversa": 18.75,
    "impressoes": 204819, "alcance": 94620, "cliques_link": 2422,
    "ctr_link": 1.18, "cpc_medio": 0.94,
    "campanhas": [...], "anuncios": [...], "regioes": [...]
  }
}
```

Campos não encontrados ficam ausentes no dict (admin pode preencher via PUT).
"""
from __future__ import annotations

import io
import re
from datetime import date
from pathlib import Path
from typing import Any

import pdfplumber

DATA_RE = re.compile(r"(\d{2})/(\d{2})/(\d{4})")
NUM_RE = r"[\d.,]+"


def _to_float(s: str | None) -> float | None:
    if s is None:
        return None
    s = s.replace("R$", "").replace("\xa0", "").strip()
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _to_int(s: str | None) -> int | None:
    if s is None:
        return None
    s = s.replace("\xa0", "").strip()
    s = s.replace(".", "").replace(",", "")
    try:
        return int(s)
    except ValueError:
        return None


def _percent(s: str | None) -> float | None:
    if s is None:
        return None
    s = s.replace("%", "").strip()
    return _to_float(s)


def parse_periodo(texto: str) -> dict | None:
    """Extrai 'entre 01/04/2026 e 23/04/2026' do cabeçalho."""
    m = re.search(
        r"entre\s+(\d{2}/\d{2}/\d{4})\s+e\s+(\d{2}/\d{2}/\d{4})",
        texto,
        flags=re.IGNORECASE,
    )
    if not m:
        return None
    ini = _parse_data_br(m.group(1))
    fim = _parse_data_br(m.group(2))
    if not ini or not fim:
        return None
    return {"inicio": ini.isoformat(), "fim": fim.isoformat()}


def _parse_data_br(s: str) -> date | None:
    m = DATA_RE.match(s)
    if not m:
        return None
    d, mo, y = (int(x) for x in m.groups())
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def _bloco(texto: str, inicio: str, fim: str | None = None) -> str:
    """Recorta o trecho entre `inicio` e `fim` (ou até o final)."""
    i = texto.find(inicio)
    if i < 0:
        return ""
    rest = texto[i:]
    if fim:
        j = rest.find(fim, len(inicio))
        if j > 0:
            return rest[:j]
    return rest


VALOR_RE = r"R?\$?\s*[\d.,]+%?"


def _captura_par(texto: str, header_pat: str, n_valores: int) -> list[str] | None:
    r"""Casa um cabeçalho (regex) seguido por linha de N valores numéricos.

    Ex.: header_pat = r"Custo\s+Impressões\s+Cliques\s+CTR.*"
    devolve a lista de strings dos valores da próxima linha.
    """
    valor_grupo = r"\s+".join([f"({VALOR_RE})"] * n_valores)
    m = re.search(header_pat + r"\n" + valor_grupo, texto, flags=re.IGNORECASE)
    return [g.strip() for g in m.groups()] if m else None


def parse_google_ads(texto: str) -> dict[str, Any]:
    bloco = _bloco(texto, "Google Ads", "Meta Ads")
    if not bloco:
        return {}
    out: dict[str, Any] = {}
    linha1 = _captura_par(
        bloco,
        r"Custo\s+Impressões\s+Cliques\s+CTR\s*\(Taxa de Cliques\)",
        4,
    )
    if linha1:
        out["custo"] = _to_float(linha1[0])
        out["impressoes"] = _to_int(linha1[1])
        out["cliques"] = _to_int(linha1[2])
        out["ctr"] = _percent(linha1[3])
    linha2 = _captura_par(bloco, r"CPC médio\s+CPM médio", 2)
    if linha2:
        out["cpc_medio"] = _to_float(linha2[0])
        out["cpm_medio"] = _to_float(linha2[1])
    return out


def parse_meta_ads(texto: str) -> dict[str, Any]:
    bloco = _bloco(texto, "Meta Ads")
    if not bloco:
        return {}
    out: dict[str, Any] = {}
    # Bloco 1 — "Valor investido / Conversas / Custo por Conversas".
    # No PDF do Reportei, o layout 3-colunas é serializado pelo extract_text como:
    #   Conversas iniciadas por Custo por conversas iniciadas por
    #   Valor investido
    #   mensagem mensagem
    #   R$2.268,81
    #   121 R$18,75
    m = re.search(
        r"Valor investido\s*\n"
        r"mensagem\s+mensagem\s*\n"
        r"(R\$\s*[\d.,]+)\s*\n"
        r"([\d.,]+)\s+(R\$\s*[\d.,]+)",
        bloco,
        flags=re.IGNORECASE,
    )
    if m:
        out["valor_investido"] = _to_float(m.group(1))
        out["conversas"] = _to_int(m.group(2))
        out["custo_conversa"] = _to_float(m.group(3))

    linha = _captura_par(
        bloco, r"Impressões Totais\s+Alcance Total\s+Total de cliques no link", 3
    )
    if linha:
        out["impressoes"] = _to_int(linha[0])
        out["alcance"] = _to_int(linha[1])
        out["cliques_link"] = _to_int(linha[2])

    linha = _captura_par(
        bloco, r"CTR\s*\(Taxa de cliques no link\)\s+CPC médio", 2
    )
    if linha:
        out["ctr_link"] = _percent(linha[0])
        out["cpc_medio"] = _to_float(linha[1])

    return out


def _extrair_tabelas(source: Path | bytes) -> list[list[list[str | None]]]:
    """Retorna todas as tabelas detectadas, em ordem. Aceita path ou bytes."""
    out: list[list[list[str | None]]] = []
    fp: object
    if isinstance(source, (bytes, bytearray)):
        fp = io.BytesIO(source)
    else:
        fp = str(source)
    with pdfplumber.open(fp) as pdf:
        for page in pdf.pages:
            for tabela in page.extract_tables() or []:
                out.append(tabela)
    return out


def _normaliza_celula(c: str | None) -> str | None:
    if c is None:
        return None
    return c.replace("\n", " ").strip() or None


def parse_relatorio(source: str | Path | bytes) -> tuple[str, dict[str, Any]]:
    """Parser completo: retorna (texto_bruto, dados_estruturados).

    Aceita um path ou os bytes do PDF (útil quando o arquivo vive no GCS).
    """
    fp: object
    if isinstance(source, (bytes, bytearray)):
        fp = io.BytesIO(source)
    else:
        fp = str(source)

    texto = ""
    with pdfplumber.open(fp) as pdf:
        for page in pdf.pages:
            texto += (page.extract_text() or "") + "\n"

    dados: dict[str, Any] = {}
    periodo = parse_periodo(texto)
    if periodo:
        dados["periodo"] = periodo

    google = parse_google_ads(texto)
    meta = parse_meta_ads(texto)

    tabelas = _extrair_tabelas(
        bytes(source) if isinstance(source, (bytes, bytearray)) else Path(source)
    )
    google["campanhas"] = _campanhas_google(tabelas)
    meta["campanhas"] = _campanhas_meta(tabelas)
    meta["anuncios"] = _anuncios_meta(tabelas)
    meta["regioes"] = _regioes_meta(tabelas)

    dados["google_ads"] = google
    dados["meta_ads"] = meta
    return texto, dados


def _campanhas_google(tabelas: list) -> list[dict]:
    """Procura a tabela de campanhas do Google (cabeçalho começa com 'Campanhas')."""
    for tab in tabelas:
        if not tab:
            continue
        header = [_normaliza_celula(c) for c in tab[0]]
        if header and header[0] and header[0].lower().startswith("campanhas"):
            campanhas = []
            for linha in tab[1:]:
                celulas = [_normaliza_celula(c) for c in linha]
                if not celulas or not celulas[0]:
                    continue
                campanhas.append(
                    {
                        "nome": celulas[0],
                        "custo": _to_float(celulas[1]) if len(celulas) > 1 else None,
                        "impressoes": _to_int(celulas[2]) if len(celulas) > 2 else None,
                        "cliques": _to_int(celulas[3]) if len(celulas) > 3 else None,
                        "ctr": _percent(celulas[4]) if len(celulas) > 4 else None,
                        "cpc_medio": _to_float(celulas[5]) if len(celulas) > 5 else None,
                        "conversoes": _to_int(celulas[6]) if len(celulas) > 6 else None,
                    }
                )
            return campanhas
    return []


def _campanhas_meta(tabelas: list) -> list[dict]:
    """Procura a tabela 'Campanhas em destaque' do Meta."""
    for tab in tabelas:
        if not tab:
            continue
        header = [_normaliza_celula(c) for c in tab[0]]
        if header and any((h or "").lower().startswith("nome da") for h in header):
            campanhas = []
            for linha in tab[1:]:
                celulas = [_normaliza_celula(c) for c in linha]
                if not celulas or not celulas[0]:
                    continue
                campanhas.append(
                    {
                        "nome": celulas[0],
                        "resultados": celulas[1] if len(celulas) > 1 else None,
                        "custo_resultado": celulas[2] if len(celulas) > 2 else None,
                        "valor_investido": _to_float(celulas[3]) if len(celulas) > 3 else None,
                        "alcance": _to_int(celulas[4]) if len(celulas) > 4 else None,
                        "impressoes": _to_int(celulas[5]) if len(celulas) > 5 else None,
                        "ctr": _percent(celulas[6]) if len(celulas) > 6 else None,
                        "cpc": _to_float(celulas[7]) if len(celulas) > 7 else None,
                        "cpm": _to_float(celulas[8]) if len(celulas) > 8 else None,
                        "frequencia": _to_float(celulas[9]) if len(celulas) > 9 else None,
                    }
                )
            return campanhas
    return []


def _anuncios_meta(tabelas: list) -> list[dict]:
    """Procura a tabela 'Anúncios em Destaque'."""
    for tab in tabelas:
        if not tab:
            continue
        header_str = " ".join((_normaliza_celula(c) or "") for c in tab[0]).lower()
        if "anúncio" in header_str and "resultados" in header_str:
            anuncios = []
            for linha in tab[1:]:
                celulas = [_normaliza_celula(c) for c in linha]
                if not celulas or not celulas[0]:
                    continue
                anuncios.append(
                    {
                        "nome": celulas[0],
                        "resultados": celulas[1] if len(celulas) > 1 else None,
                        "custo_resultado": celulas[2] if len(celulas) > 2 else None,
                        "valor_investido": _to_float(celulas[3]) if len(celulas) > 3 else None,
                        "alcance": _to_int(celulas[4]) if len(celulas) > 4 else None,
                        "impressoes": _to_int(celulas[5]) if len(celulas) > 5 else None,
                        "ctr": _percent(celulas[6]) if len(celulas) > 6 else None,
                        "cpc": _to_float(celulas[7]) if len(celulas) > 7 else None,
                        "cpm": _to_float(celulas[8]) if len(celulas) > 8 else None,
                    }
                )
            return anuncios
    return []


def _regioes_meta(tabelas: list) -> list[dict]:
    """Procura a tabela 'Regiões com maior alcance'."""
    for tab in tabelas:
        if not tab:
            continue
        header = [_normaliza_celula(c) for c in tab[0]]
        if header and (header[0] or "").lower().startswith("regi"):
            regioes = []
            for linha in tab[1:]:
                celulas = [_normaliza_celula(c) for c in linha]
                if not celulas or not celulas[0]:
                    continue
                regioes.append(
                    {
                        "nome": celulas[0],
                        "alcance": _to_int(celulas[1]) if len(celulas) > 1 else None,
                        "impressoes": _to_int(celulas[2]) if len(celulas) > 2 else None,
                        "frequencia": _to_float(celulas[3]) if len(celulas) > 3 else None,
                        "valor_investido": _to_float(celulas[4]) if len(celulas) > 4 else None,
                        "cpm": _to_float(celulas[5]) if len(celulas) > 5 else None,
                    }
                )
            return regioes
    return []
