"""Coleta e normaliza dados do IBGE (UF, população, municípios)."""

from __future__ import annotations

from datetime import date

import http_util

ESTADOS_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados"
METADADOS_6579_URL = "https://servicodados.ibge.gov.br/api/v3/agregados/6579/metadados"
POP_TEMPLATE = (
    "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/{ano}"
    "/variaveis/9324?localidades=N3[all]"
)


def _anos_candidatos_populacao() -> list[int]:
    meta = http_util.get_json(METADADOS_6579_URL)
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
        pop_raw = http_util.get_json(POP_TEMPLATE.format(ano=ano))
        if isinstance(pop_raw, list) and len(pop_raw) > 0:
            series = pop_raw[0]["resultados"][0]["series"]  # type: ignore[index]
            return str(ano), series
    raise ValueError(
        "IBGE: nenhum ano candidato retornou população por UF (tabela 6579)."
    )


def fetch_estados_populacao() -> list[dict]:
    """Lista ordenada por sigla: nome, sigla, região, população estimada (6579)."""
    estados_raw = http_util.get_json(ESTADOS_URL)
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


def _id_uf_por_sigla(sigla: str) -> str:
    estados_raw = http_util.get_json(ESTADOS_URL)
    if not isinstance(estados_raw, list):
        raise ValueError("Resposta inesperada da API de estados")
    sigla_u = sigla.strip().upper()
    for e in estados_raw:
        if e.get("sigla") == sigla_u:
            return str(e["id"])
    raise KeyError(f"UF desconhecida: {sigla}")


def fetch_municipios_por_uf(sigla: str) -> list[dict]:
    """
    Municípios de uma UF (id, nome, microrregião simplificada).
    Volume pode ser grande; use uma UF por vez no pipeline.
    """
    uf_id = _id_uf_por_sigla(sigla)
    url = f"https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf_id}/municipios"
    rows = http_util.get_json(url)
    if not isinstance(rows, list):
        raise ValueError("Resposta inesperada da API de municípios")
    out: list[dict] = []
    for m in rows:
        micro = m.get("microrregiao") or {}
        meso = micro.get("mesorregiao") or {}
        out.append(
            {
                "id": str(m["id"]),
                "nome": m["nome"],
                "microrregiao": micro.get("nome"),
                "mesorregiao": meso.get("nome"),
            }
        )
    out.sort(key=lambda x: x["nome"])
    return out
