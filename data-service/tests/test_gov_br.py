from __future__ import annotations

from unittest.mock import patch

import httpx
import pytest

import fetchers.gov_br as gov


def _http_error(status: int) -> httpx.HTTPStatusError:
    req = httpx.Request("GET", gov.CKAN_SEARCH_URL)
    res = httpx.Response(status, request=req)
    return httpx.HTTPStatusError("erro", request=req, response=res)


@patch("fetchers.gov_br.http_util.get_json")
def test_fetch_catalogo_401_retorna_stub(mock_get_json):
    mock_get_json.side_effect = _http_error(401)
    out = gov.fetch_catalogo_amostra()
    assert out["indisponivel"] is True
    assert out["http_status"] == 401
    assert out["amostra"] == []


@patch("fetchers.gov_br.http_util.get_json")
def test_fetch_catalogo_403_retorna_stub(mock_get_json):
    mock_get_json.side_effect = _http_error(403)
    out = gov.fetch_catalogo_amostra()
    assert out["indisponivel"] is True
    assert out["http_status"] == 403


@patch("fetchers.gov_br.http_util.get_json")
def test_fetch_catalogo_outro_erro_http_propaga(mock_get_json):
    mock_get_json.side_effect = _http_error(404)
    with pytest.raises(httpx.HTTPStatusError):
        gov.fetch_catalogo_amostra()


@patch("fetchers.gov_br.http_util.get_json")
def test_fetch_catalogo_sucesso(mock_get_json):
    mock_get_json.return_value = {
        "success": True,
        "result": {
            "count": 99,
            "results": [
                {
                    "title": "Teste",
                    "name": "teste",
                    "id": "abc",
                }
            ],
        },
    }
    out = gov.fetch_catalogo_amostra()
    assert out.get("indisponivel") is None
    assert out["total_aproximado"] == 99
    assert len(out["amostra"]) == 1
    assert out["amostra"][0]["nome"] == "teste"
