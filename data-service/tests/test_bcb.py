from __future__ import annotations

from unittest.mock import patch

import fetchers.bcb as bcb


@patch("fetchers.bcb.http_util.get_json")
def test_fetch_inflacao_ipca_ultimos_meses(mock_get_json):
    mock_get_json.return_value = [
        {"data": "01/11/2024", "valor": "0,42"},
        {"data": "01/12/2024", "valor": "0,52"},
    ]
    out = bcb.fetch_inflacao_ipca(ultimos_meses=2)
    assert len(out) == 2
    assert out[0]["ipca_mensal_percentual"] == 0.42
    assert out[1]["ipca_mensal_percentual"] == 0.52
    assert out[0]["serie_sgs"] == 433


@patch("fetchers.bcb.http_util.get_json")
def test_fetch_cambio_usd(mock_get_json):
    mock_get_json.return_value = [{"data": "01/01/2025", "valor": "5,90"}]
    out = bcb.fetch_cambio_usd(ultimos_dias=1)
    assert len(out) == 1
    assert out[0]["usd_brl"] == 5.9
