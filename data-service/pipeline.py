"""
Orquestra buscas, aplica tratamento e grava JSON consumidos pela API Node.

Uso (pasta data-service):
  pip install -r requirements.txt
  python pipeline.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from fetchers import bcb, clima, ibge


def _root() -> Path:
    return Path(__file__).resolve().parents[1]


def _cache_dir() -> Path:
    d = _root() / "data" / "cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def run() -> None:
    cache = _cache_dir()
    meta = {"gerado_em": datetime.now(timezone.utc).isoformat()}

    estados = ibge.fetch_estados_populacao()
    (cache / "estados_populacao.json").write_text(
        json.dumps({"meta": meta, "dados": estados}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    inflacao = bcb.fetch_inflacao_ipca(24)
    (cache / "inflacao.json").write_text(
        json.dumps({"meta": meta, "serie": inflacao}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    for cidade in sorted(clima.CIDADES.keys()):
        cl = clima.fetch_clima_cidade(cidade)
        safe = cidade.replace(" ", "_")
        (cache / f"clima_{safe}.json").write_text(
            json.dumps({"meta": meta, "dados": cl}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    print(f"Arquivos gravados em {cache}", file=sys.stderr)


if __name__ == "__main__":
    run()
