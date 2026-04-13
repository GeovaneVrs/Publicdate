"""Coleta e normaliza dados de população por UF (IBGE)."""

from __future__ import annotations

from datetime import date

import httpx

ESTADOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
METADADOS_6579_URL = "https://servicodados.ibge.gov.br/api/v3/agregados/6579/metadados"
# Tabela 6579 — população residente estimada por UF (SIDRA); o ano precisa existir na API (2022 pode vir []).
POP_TEMPLATE = (
    "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/{ano}"
    "/variaveis/9324?localidades=N3[all]"
)


def _get_json(url: str) -> object:
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.json()


def _anos_candidatos_populacao() -> list[int]:
    meta = _get_json(METADADOS_6579_URL)
    out: list[int] = []
    if isinstance(meta, dict):
        per = meta.get("periodicidade")
        if isinstance(per, dict) and isinstance(per.get("fim"), int):
            out.append(per["fim"])
    y = date.today().year
    for d in range(0, 4):
        if y - d not in out:
            out.append(y - d)
    return out


def _populacao_por_uf() -> tuple[str, list[dict]]:
    for ano in _anos_candidatos_populacao():
        pop_raw = _get_json(POP_TEMPLATE.format(ano=ano))
        if isinstance(pop_raw, list) and len(pop_raw) > 0:
            series = pop_raw[0]["resultados"][0]["series"]  # type: ignore[index]
            return str(ano), series
    raise ValueError(
        "IBGE: nenhum ano candidato retornou população por UF (tabela 6579)."
    )


def fetch_estados_populacao() -> list[dict]:
    """
    Lista ordenada por sigla: nome, sigla, região e população (estimativa IBGE, tabela 6579).
    """
    estados_raw = _get_json(ESTADOS_URL)
    if not isinstance(estados_raw, list):
        raise ValueError("Resposta inesperada da API de estados")

    ano_ref, resultados = _populacao_por_uf()

    pop_por_id: dict[str, int] = {}
    for serie in resultados:
        loc = serie["localidade"]["id"]
        val = serie["serie"].get(ano_ref)
        if val is not None:
            pop_por_id[str(loc)] = int(val)

    out: list[dict] = []
    for e in estados_raw:
        eid = str(e["id"])
        microrregiao = e.get("regiao-imediata", {})
        intermediaria = microrregiao.get("regiao-intermediaria", {})
        regiao = intermediaria.get("regiao", {})
        out.append(
            {
                "id": eid,
                "sigla": e["sigla"],
                "nome": e["nome"],
                "regiao": regiao.get("nome"),
                "populacao": pop_por_id.get(eid),
                "populacao_ano_referencia": int(ano_ref),
            }
        )

    out.sort(key=lambda x: x["sigla"])
    return out
