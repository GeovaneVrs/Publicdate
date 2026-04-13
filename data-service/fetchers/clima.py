"""Clima atual via Open-Meteo (sem chave; adequado para demonstração)."""

from __future__ import annotations

import httpx

# Coordenadas aproximadas (centro urbano)
CIDADES: dict[str, tuple[float, float]] = {
    "recife": (-8.0476, -34.8770),
    "salvador": (-12.9714, -38.5014),
    "fortaleza": (-3.7172, -38.5433),
    "sao paulo": (-23.5505, -46.6333),
    "rio de janeiro": (-22.9068, -43.1729),
}


def fetch_clima_cidade(slug: str) -> dict:
    slug_norm = slug.strip().lower().replace("-", " ")
    if slug_norm not in CIDADES:
        raise KeyError(f"Cidade não mapeada: {slug}")

    lat, lon = CIDADES[slug_norm]
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
        "&timezone=America%2FRecife"
    )
    with httpx.Client(timeout=30.0) as client:
        r = client.get(url)
        r.raise_for_status()
        data = r.json()

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
