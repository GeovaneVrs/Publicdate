"""Clima atual e previsão via Open-Meteo (sem chave; demonstração)."""

from __future__ import annotations

import http_util

# Coordenadas aproximadas (centro urbano)
CIDADES: dict[str, tuple[float, float]] = {
    "recife": (-8.0476, -34.8770),
    "salvador": (-12.9714, -38.5014),
    "fortaleza": (-3.7172, -38.5433),
    "sao paulo": (-23.5505, -46.6333),
    "rio de janeiro": (-22.9068, -43.1729),
    "belo horizonte": (-19.9167, -43.9345),
    "curitiba": (-25.4284, -49.2733),
    "manaus": (-3.1190, -60.0217),
    "brasilia": (-15.7939, -47.8828),
}


def _slug(slug: str) -> str:
    return slug.strip().lower().replace("-", " ")


def fetch_clima_cidade(slug: str) -> dict:
    slug_norm = _slug(slug)
    if slug_norm not in CIDADES:
        raise KeyError(f"Cidade não mapeada: {slug}")

    lat, lon = CIDADES[slug_norm]
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        "&timezone=America%2FSao_Paulo"
    )
    data = http_util.get_json(url, timeout=30.0)
    cur = data.get("current", {})
    return {
        "cidade": slug_norm,
        "latitude": lat,
        "longitude": lon,
        "atualizado_em": cur.get("time"),
        "temperatura_c": cur.get("temperature_2m"),
        "umidade_percentual": cur.get("relative_humidity_2m"),
        "codigo_tempo": cur.get("weather_code"),
        "vento_kmh": cur.get("wind_speed_10m"),
        "fonte": "Open-Meteo",
    }


def fetch_previsao_7_dias(slug: str) -> dict:
    """Máx/mín e código de tempo para os próximos 7 dias."""
    slug_norm = _slug(slug)
    if slug_norm not in CIDADES:
        raise KeyError(f"Cidade não mapeada: {slug}")
    lat, lon = CIDADES[slug_norm]
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum"
        "&forecast_days=7&timezone=America%2FSao_Paulo"
    )
    data = http_util.get_json(url, timeout=30.0)
    daily = data.get("daily") or {}
    times = daily.get("time") or []
    out_days: list[dict] = []
    for i, day in enumerate(times):
        out_days.append(
            {
                "data": day,
                "temp_max_c": (daily.get("temperature_2m_max") or [None] * len(times))[i],
                "temp_min_c": (daily.get("temperature_2m_min") or [None] * len(times))[i],
                "precipitacao_mm": (daily.get("precipitation_sum") or [None] * len(times))[i],
                "codigo_tempo": (daily.get("weather_code") or [None] * len(times))[i],
            }
        )
    return {
        "cidade": slug_norm,
        "latitude": lat,
        "longitude": lon,
        "dias": out_days,
        "fonte": "Open-Meteo",
    }
