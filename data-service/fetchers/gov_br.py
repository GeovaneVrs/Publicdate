"""Amostra do catálogo dados.gov.br via API CKAN."""

from __future__ import annotations

import logging
import os

import httpx

import http_util
from fetchers.schemas import parse_ckan_package_search

log = logging.getLogger(__name__)

CKAN_SEARCH_URL = "https://dados.gov.br/api/3/action/package_search?rows=5"


def _catalogo_indisponivel(http_status: int, motivo: str) -> dict:
    """Resposta estável quando o portal não aceita requisição anônima."""
    return {
        "total_aproximado": None,
        "amostra": [],
        "indisponivel": True,
        "http_status": http_status,
        "motivo": motivo,
    }


def fetch_catalogo_amostra() -> dict:
    """
    `package_search` com poucos resultados — demonstração CKAN.

    O portal passou a responder **401 Bearer** para muitas requisições sem token.
    Opcional: defina ``DADOS_GOV_BR_TOKEN`` (Bearer) no ambiente.
    Sem token, em 401/403 grava-se amostra vazia e a pipeline segue com ``--skip gov`` se preferir.
    """
    token = (os.environ.get("DADOS_GOV_BR_TOKEN") or "").strip()
    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        raw = http_util.get_json(CKAN_SEARCH_URL, timeout=45.0, headers=headers or None)
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code in (401, 403):
            log.warning(
                "dados.gov.br CKAN retornou %s. Defina DADOS_GOV_BR_TOKEN ou use --skip gov. "
                "Gravando amostra vazia.",
                code,
            )
            return _catalogo_indisponivel(
                code,
                "O portal exige autenticação Bearer para esta rota. "
                "Configure DADOS_GOV_BR_TOKEN (se disponível) ou pule a etapa: python pipeline.py --skip gov",
            )
        raise

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
