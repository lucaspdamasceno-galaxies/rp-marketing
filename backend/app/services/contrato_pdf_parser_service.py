"""Parser de PDF de contrato — extrai título, contratante, escopo, valor, duração, data.

Funciona com o template usado pela RP Marketing (ver "Contrato Sidney Executive
Colchões.pdf" no repo). Casa por padrões do português: cláusulas numeradas,
"valor mensal de R$ X,XX", "duração inicial de N meses", datas por extenso.

Campos não encontrados ficam ausentes do dict — o admin pode preencher na revisão.
"""
from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

ESCOPO_KEYWORDS: dict[str, list[str]] = {
    "trafego_pago": [
        r"tr[áa]fego pago",
        r"campanhas? de tr[áa]fego",
        r"gest[ãa]o de tr[áa]fego",
        r"google ads",
        r"meta ads",
        r"facebook ads",
    ],
    "gestao_redes_sociais": [
        r"gest[ãa]o de redes sociais",
        r"gerenciamento de redes sociais",
        r"social media",
    ],
    "producao_conteudo": [
        r"produ[çc][ãa]o de conte[úu]do",
        r"cria[çc][ãa]o de conte[úu]do",
        r"design gr[áa]fico",
        r"edi[çc][ãa]o de v[íi]deo",
    ],
    "branding": [
        r"branding",
        r"identidade visual",
        r"naming",
    ],
    "site": [
        r"\bsite\b",
        r"\bwebsite\b",
        r"landing page",
        r"hotsite",
    ],
    "consultoria": [
        r"consultoria",
        r"mentoria",
    ],
}

MES_NUMERO = {
    "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3,
    "abril": 4, "maio": 5, "junho": 6, "julho": 7,
    "agosto": 8, "setembro": 9, "outubro": 10,
    "novembro": 11, "dezembro": 12,
}

DATA_BR_RE = re.compile(
    r"(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})",
    re.IGNORECASE,
)


def _to_float(s: str) -> float | None:
    s = s.replace("R$", "").replace("\xa0", "").strip()
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _extrair_texto(pdf_path: str | Path) -> str:
    with pdfplumber.open(str(pdf_path)) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)


def parse_contrato(pdf_path: str | Path) -> tuple[dict, str]:
    """Retorna (dados_extraídos, texto_bruto). Campos ausentes ficam fora do dict."""
    texto = _extrair_texto(pdf_path)
    lower = texto.lower()
    out: dict[str, object] = {}

    # --- Título: cabeçalho do contrato + nome do contratante ---
    cabecalho = _primeira_linha_significativa(texto)
    contratante = re.search(r"CONTRATANTE:\s*([^,\n]+)", texto, re.IGNORECASE)
    if cabecalho:
        nome_c = (contratante.group(1).strip().rstrip(",") if contratante else "")
        if nome_c:
            out["titulo"] = f"{cabecalho} — {nome_c}"
        else:
            out["titulo"] = cabecalho

    # --- Escopo: keywords ---
    escopo: list[str] = []
    for chave, patterns in ESCOPO_KEYWORDS.items():
        for p in patterns:
            if re.search(p, lower):
                escopo.append(chave)
                break
    if escopo:
        out["escopo"] = escopo

    # --- Valor mensal ---
    valor = re.search(
        r"valor\s+mensal\s+de\s+R\$\s*([\d.,]+)", texto, re.IGNORECASE
    )
    if not valor:
        valor = re.search(
            r"R\$\s*([\d.,]+)\s*(?:\([^)]*\))?\s*(?:mensa(?:is|l)|por\s+m[êe]s|/m[êe]s)",
            texto,
            re.IGNORECASE,
        )
    if valor:
        v = _to_float(valor.group(1))
        if v is not None:
            out["valor_mensal"] = v

    # --- Duração em meses ---
    dur = re.search(
        r"dura[çc][ãa]o\s+inicial\s+de\s+(\d+)\s*\(?[^)]*\)?\s*m[êe]s(?:es)?",
        texto,
        re.IGNORECASE,
    )
    if not dur:
        dur = re.search(
            r"prazo\s+(?:de\s+)?(?:vig[êe]ncia\s+)?(?:de\s+)?(\d+)\s*\(?[^)]*\)?\s*m[êe]s(?:es)?",
            texto,
            re.IGNORECASE,
        )
    if not dur:
        dur = re.search(
            r"vig[êe]ncia\s+de\s+(\d+)\s*\(?[^)]*\)?\s*m[êe]s(?:es)?",
            texto,
            re.IGNORECASE,
        )
    if dur:
        try:
            out["duracao_meses"] = int(dur.group(1))
        except ValueError:
            pass

    # --- Data de início: última data por extenso (assinatura) ---
    matches = list(DATA_BR_RE.finditer(texto))
    if matches:
        d, mes, y = matches[-1].groups()
        mes_norm = mes.lower().replace("ç", "c")
        mes_num = MES_NUMERO.get(mes_norm) or MES_NUMERO.get(mes.lower())
        if mes_num:
            try:
                out["data_inicio"] = f"{y}-{mes_num:02d}-{int(d):02d}"
            except ValueError:
                pass

    # --- Descrição: cláusula "OBJETO" ---
    obj = re.search(
        r"1\.\s*OBJETO\s*\n(.+?)(?=\n\s*\d+\.\s|\Z)",
        texto,
        re.DOTALL | re.IGNORECASE,
    )
    if obj:
        descricao = re.sub(r"\s+", " ", obj.group(1).strip())
        # limita a 2000 chars pro form não estourar
        out["descricao"] = descricao[:2000]

    return out, texto


def _primeira_linha_significativa(texto: str) -> str | None:
    """Retorna o título do contrato — primeiras linhas com 'CONTRATO'."""
    linhas: list[str] = []
    for linha in texto.split("\n"):
        s = linha.strip()
        if not s:
            if linhas:
                break
            continue
        if "CONTRATO" in s.upper() or linhas:
            linhas.append(s)
        if len(linhas) >= 3:
            break
    if not linhas:
        return None
    titulo = " ".join(linhas).strip()
    titulo = re.sub(r"\s+", " ", titulo)
    return titulo[:255]
