"""
Orquestra buscas, validação e gravação do cache consumido pela API Node.

Uso (pasta data-service):
  pip install -r requirements.txt
  python pipeline.py
  python pipeline.py --only ibge,bcb
  python pipeline.py --skip clima --municipios-uf SP

Variáveis de ambiente:
  DATA_CACHE_DIR — diretório de saída (ex.: /cache no Docker)
  MUNICIPIOS_UF — sigla da UF para municípios (padrão PE)
  LOG_JSON=1 — logs em JSON no stderr
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import logging_config
from fetchers import bcb, clima, gov_br, ibge

logging_config.setup_logging()
log = logging.getLogger("pipeline")

PIPELINE_VERSAO = "1.1.0"


def _cache_dir() -> Path:
    raw = os.environ.get("DATA_CACHE_DIR")
    if raw:
        d = Path(raw)
    else:
        d = Path(__file__).resolve().parents[1] / "data" / "cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _parse_csv(val: str | None) -> set[str]:
    if not val:
        return set()
    return {x.strip().lower() for x in val.split(",") if x.strip()}


def _meta_base() -> dict:
    return {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "pipeline_versao": PIPELINE_VERSAO,
    }


def _write(cache: Path, filename: str, payload: dict) -> None:
    payload.setdefault("meta", {})
    payload["meta"].update(_meta_base())
    text1 = json.dumps(payload, ensure_ascii=False, indent=2)
    payload["meta"]["tamanho_bytes"] = len(text1.encode("utf-8"))
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    path = cache / filename
    path.write_text(text, encoding="utf-8")
    log.info("gravado %s (%s bytes)", filename, payload["meta"]["tamanho_bytes"])


def run(*, only: set[str], skip: set[str], municipios_uf: str) -> None:
    cache = _cache_dir()

    def want(step: str) -> bool:
        if only and step not in only:
            return False
        return step not in skip

    if want("ibge"):
        log.info("etapa ibge: estados + população")
        estados = ibge.fetch_estados_populacao()
        _write(cache, "estados_populacao.json", {"dados": estados})

        uf = municipios_uf.strip().upper()
        log.info("etapa ibge: municípios UF=%s", uf)
        municipios = ibge.fetch_municipios_por_uf(uf)
        _write(cache, f"municipios_{uf.lower()}.json", {"uf": uf, "dados": municipios})

    if want("bcb"):
        log.info("etapa bcb: IPCA")
        inflacao = bcb.fetch_inflacao_ipca(24)
        _write(cache, "inflacao.json", {"serie": inflacao})

        log.info("etapa bcb: Selic")
        selic = bcb.fetch_selic_diaria(120)
        _write(cache, "selic.json", {"serie": selic})

        log.info("etapa bcb: câmbio USD")
        cambio = bcb.fetch_cambio_usd(120)
        _write(cache, "cambio_usd.json", {"serie": cambio})

    if want("clima"):
        for cidade in sorted(clima.CIDADES.keys()):
            log.info("etapa clima atual: %s", cidade)
            atual = clima.fetch_clima_cidade(cidade)
            safe = cidade.replace(" ", "_")
            _write(cache, f"clima_{safe}.json", {"dados": atual})

            log.info("etapa clima previsão: %s", cidade)
            prev = clima.fetch_previsao_7_dias(cidade)
            _write(cache, f"previsao_clima_{safe}.json", {"dados": prev})

    if want("gov"):
        log.info("etapa gov.br CKAN")
        catalogo = gov_br.fetch_catalogo_amostra()
        _write(cache, "gov_catalogo_amostra.json", {"dados": catalogo})

    print(f"Arquivos gravados em {cache}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline dados públicos BR")
    parser.add_argument(
        "--only",
        default=None,
        help="Executar só estes módulos (csv): ibge, bcb, clima, gov",
    )
    parser.add_argument(
        "--skip",
        default=None,
        help="Pular módulos (csv): ibge, bcb, clima, gov",
    )
    parser.add_argument(
        "--municipios-uf",
        default=os.environ.get("MUNICIPIOS_UF", "PE"),
        help="UF para arquivo de municípios (padrão PE)",
    )
    args = parser.parse_args()
    only = _parse_csv(args.only)
    skip = _parse_csv(args.skip)
    run(only=only, skip=skip, municipios_uf=args.municipios_uf)


if __name__ == "__main__":
    main()
