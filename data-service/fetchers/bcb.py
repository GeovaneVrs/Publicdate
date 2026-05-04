"""Séries temporais do Banco Central (SGS / bcdata)."""

from __future__ import annotations

from datetime import date, timedelta

import http_util
from fetchers.schemas import parse_bcb_sgs_list

# Referência: Portal de dados abertos / SGS (verificar descrição no BCB).
SGS_IPCA_MENSAL = 433  # IPCA — % a.m.
SGS_SELIC = 11  # Taxa Selic (série diária no SGS)
SGS_USD_BRL = 1  # Dólar comercial (venda), R$ / US$


def _url_sgs(codigo: int, data_inicial: str, data_final: str) -> str:
    return (
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs."
        f"{codigo}/dados?formato=json&dataInicial={data_inicial}&dataFinal={data_final}"
    )


def fetch_sgs_serie(
    codigo: int,
    *,
    dias: int,
    campo_valor: str,
    descricao: str,
    limite_linhas: int | None = None,
) -> list[dict]:
    """
    Busca série SGS entre hoje e N dias atrás; retorna dicts com data + campo_valor.
    """
    fim = date.today()
    inicio = fim - timedelta(days=dias)
    data_inicial = inicio.strftime("%d/%m/%Y")
    data_final = fim.strftime("%d/%m/%Y")
    url = _url_sgs(codigo, data_inicial, data_final)
    raw = http_util.get_json(url)
    rows = parse_bcb_sgs_list(raw)
    out: list[dict] = []
    for item in rows:
        out.append(
            {
                "data": item.data,
                campo_valor: item.valor_float(),
                "serie_sgs": codigo,
                "descricao": descricao,
            }
        )
    if limite_linhas is not None:
        out = out[-limite_linhas:]
    return out


def fetch_inflacao_ipca(ultimos_meses: int = 24) -> list[dict]:
    """Últimos N meses de IPCA mensal (% a.m.), mais recente por último."""
    dias = 31 * (ultimos_meses + 2)
    rows = fetch_sgs_serie(
        SGS_IPCA_MENSAL,
        dias=dias,
        campo_valor="ipca_mensal_percentual",
        descricao="IPCA % a.m.",
        limite_linhas=None,
    )
    return rows[-ultimos_meses:]


def fetch_selic_diaria(ultimos_dias: int = 90) -> list[dict]:
    """Selic (série 11) — valores diários recentes."""
    return fetch_sgs_serie(
        SGS_SELIC,
        dias=ultimos_dias + 5,
        campo_valor="selic_percentual",
        descricao="Taxa Selic (SGS 11)",
        limite_linhas=ultimos_dias,
    )


def fetch_cambio_usd(ultimos_dias: int = 90) -> list[dict]:
    """Câmbio USD (série 1) — R$ por US$ (venda), diário."""
    return fetch_sgs_serie(
        SGS_USD_BRL,
        dias=ultimos_dias + 5,
        campo_valor="usd_brl",
        descricao="Dólar comercial (venda), R$/US$",
        limite_linhas=ultimos_dias,
    )
