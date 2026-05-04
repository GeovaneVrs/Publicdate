"""Validação mínima das respostas das fontes (Python puro — sem dependências nativas)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class BcbSgsItem:
    data: str
    valor: str

    @classmethod
    def from_row(cls, row: object) -> BcbSgsItem:
        if not isinstance(row, dict):
            raise ValueError("BCB: linha não é objeto")
        data = row.get("data")
        valor = row.get("valor")
        if not isinstance(data, str) or len(data) < 8:
            raise ValueError("BCB: campo data inválido")
        if not isinstance(valor, str):
            raise ValueError("BCB: campo valor inválido")
        return cls(data=data, valor=valor)

    def valor_float(self) -> float:
        return float(self.valor.replace(",", "."))


def parse_bcb_sgs_list(raw: Any) -> list[BcbSgsItem]:
    if not isinstance(raw, list):
        raise ValueError("BCB: resposta não é lista")
    return [BcbSgsItem.from_row(x) for x in raw]


def parse_ckan_package_search(raw: Any) -> dict:
    """Valida corpo típico de `package_search` do CKAN."""
    if not isinstance(raw, dict):
        raise ValueError("CKAN: resposta não é objeto")
    if raw.get("success") is not True:
        raise ValueError("CKAN: success != true")
    result = raw.get("result")
    if not isinstance(result, dict):
        raise ValueError("CKAN: result inválido")
    return result
