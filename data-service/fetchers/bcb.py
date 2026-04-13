"""Série de inflação (IPCA mensal) — Banco Central (SGS)."""

from __future__ import annotations

import httpx
from datetime import date, timedelta

SGS_IPCA_MENSAL = 433  # IPCA — % a.m.


def fetch_inflacao_ipca(ultimos_meses: int = 24) -> list[dict]:
    """
    Últimos N meses de IPCA mensal (% a.m.), mais recente por último.
    """
    fim = date.today()
    inicio = fim - timedelta(days=31 * (ultimos_meses + 2))
    data_inicial = inicio.strftime("%d/%m/%Y")
    data_final = fim.strftime("%d/%m/%Y")
    url = (
        "https://api.bcb.gov.br/dados/serie/bcdata.sgs."
        f"{SGS_IPCA_MENSAL}/dados?formato=json"
        f"&dataInicial={data_inicial}&dataFinal={data_final}"
    )
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url)
        r.raise_for_status()
        rows = r.json()

    if not isinstance(rows, list):
        raise ValueError("Resposta inesperada do BCB")

    out = [
        {
            "data": row["data"],
            "ipca_mensal_percentual": float(row["valor"].replace(",", ".")),
        }
        for row in rows
    ]
    return out[-ultimos_meses:]
