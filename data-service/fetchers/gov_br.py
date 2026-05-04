"""Amostra do catálogo dados.gov.br via API CKAN (sem chave)."""

from __future__ import annotations

import http_util
from fetchers.schemas import parse_ckan_package_search


def fetch_catalogo_amostra() -> dict:
    """
    `package_search` com poucos resultados — útil para demonstrar integração
    com o portal de dados abertos (cada recurso tem URL própria para aprofundar).
    """
    url = "https://dados.gov.br/api/3/action/package_search?rows=5"
    raw = http_util.get_json(url, timeout=45.0)
    result = parse_ckan_package_search(raw)
    results = result.get("results")
    if not isinstance(results, list):
        raise ValueError("CKAN: results ausente")
    slim: list[dict] = []
    for pkg in results:
        if not isinstance(pkg, dict):
            continue
        slim.append(
            {
                "titulo": pkg.get("title"),
                "nome": pkg.get("name"),
                "id": pkg.get("id"),
                "url_portal": f"https://dados.gov.br/dados/conjuntos-dados/{pkg.get('name')}",
            }
        )
    return {"total_aproximado": result.get("count"), "amostra": slim}
