import { ChevronDown, MapPin, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

type Mun = { id: string; nome: string; microrregiao?: string | null; mesorregiao?: string | null };

type Res = {
  meta?: { gerado_em?: string };
  uf: string;
  paginacao: { limit: number; offset: number; total: number };
  municipios: Mun[];
};

const PREVIEW = 10;

function formatIntPt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function MunicipiosPage() {
  const [input, setInput] = useState("PE");
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (sigla: string) => {
    setLoading(true);
    setErr(null);
    setData(null);
    setShowAll(false);
    setQ("");
    try {
      const j = await fetchJson<Res>(
        `/populacao/municipios/${encodeURIComponent(sigla)}?limit=100&offset=0`,
      );
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("PE");
  }, [load]);

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    const s = input.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(s)) void load(s);
    else setErr("Use duas letras, ex.: PE, SP, RJ.");
  };

  const sorted = useMemo(() => {
    if (!data?.municipios.length) return [];
    return [...data.municipios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [data]);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sorted;
    return sorted.filter((m) => m.nome.toLowerCase().includes(s) || (m.microrregiao ?? "").toLowerCase().includes(s));
  }, [sorted, q]);

  const visiveis = useMemo(() => {
    if (showAll || filtrados.length <= PREVIEW) return filtrados;
    return filtrados.slice(0, PREVIEW);
  }, [filtrados, showAll]);

  const filtroAtivo = q.trim().length > 0;
  const baseOrdem = filtroAtivo ? filtrados : sorted;
  const primeiro = baseOrdem[0] ?? null;
  const ultimo = baseOrdem.length ? baseOrdem[baseOrdem.length - 1] : null;

  const badgeLabel =
    !showAll && filtrados.length > PREVIEW ? `Top ${PREVIEW}` : `${filtrados.length} municípios`;

  return (
    <div className="space-y-6 text-[rgba(255,255,255,0.85)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-normal tracking-tight text-white/90">Municípios</h1>
        <p className="text-sm text-white/50">Informações sobre municípios brasileiros — Fonte: IBGE</p>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-white/90">Maiores municípios por população</h2>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-white/45">{badgeLabel}</span>
              </div>
              <p className="text-xs text-white/35">
                População, área e PIB aparecem como &quot;—&quot; até o pipeline expor esses campos. A lista abaixo
                segue ordem alfabética (cache local).
              </p>
            </div>
            <form
              onSubmit={onSubmit}
              className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end sm:gap-2"
            >
              <div>
                <label htmlFor="uf-mun" className="mb-1 block text-xs text-white/45">
                  UF
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    id="uf-mun"
                    maxLength={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    className="w-full min-w-[120px] rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 font-mono text-sm uppercase tracking-widest text-white/90 outline-none focus:ring-1 focus:ring-violet-500/50 sm:w-32"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-violet-400 hover:to-violet-500"
              >
                Carregar
              </button>
            </form>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative flex min-w-[200px] flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                type="search"
                placeholder="Buscar município ou microrregião…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:ring-1 focus:ring-violet-500/50"
              />
            </label>
            <p className="shrink-0 text-sm text-white/50">
              UF <span className="font-mono text-white/80">{data.uf}</span>
              <span className="text-white/35"> · </span>
              Total IBGE:{" "}
              <span className="tabular-nums text-white/80">{formatIntPt(data.paginacao.total)}</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed text-left text-base">
              <thead>
                <tr className="border-b border-white/15 text-sm font-bold text-white/50">
                  <th className="w-[32%] py-2 pr-4">Município</th>
                  <th className="w-[10%] py-2 pr-4">UF</th>
                  <th className="w-[22%] py-2 pr-4 text-right">População</th>
                  <th className="w-[18%] py-2 pr-4 text-right">Área (km²)</th>
                  <th className="w-[18%] py-2 text-right">PIB (milhões)</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-white/[0.05] font-normal transition hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4 text-white/90">{m.nome}</td>
                    <td className="py-3 pr-4 font-mono text-sm text-white/80">{data.uf}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-white/40" title="Não disponível no cache.">
                      —
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-white/40" title="Não disponível no cache.">
                      —
                    </td>
                    <td className="py-3 text-right tabular-nums text-white/40" title="Não disponível no cache.">
                      —
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAll && filtrados.length > PREVIEW ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white/90"
              >
                Ver todos os {filtrados.length} municípios
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 border-t border-white/15 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/50">Total de municípios</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">
                {formatIntPt(data.paginacao.total)}
              </p>
              <p className="mt-1 text-xs text-white/40">Cadastrados na UF {data.uf} (IBGE)</p>
            </div>
            <div>
              <p className="text-sm text-white/50">{filtroAtivo ? "Primeiro (resultados)" : "Primeiro (A→Z)"}</p>
              <p className="mt-1 text-xl font-semibold leading-snug text-white/90">
                {primeiro ? primeiro.nome : "—"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {primeiro?.microrregiao ? `${primeiro.microrregiao}` : "Microrregião —"}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/50">{filtroAtivo ? "Último (resultados)" : "Último (A→Z)"}</p>
              <p className="mt-1 text-xl font-semibold leading-snug text-white/90">
                {ultimo ? ultimo.nome : "—"}
              </p>
              <p className="mt-1 text-xs text-white/40">
                {ultimo?.microrregiao ? `${ultimo.microrregiao}` : "Microrregião —"}
              </p>
            </div>
          </div>

          {data.paginacao.total > data.municipios.length ? (
            <p className="mt-3 text-xs text-white/35">
              Exibindo até {data.municipios.length} registros desta UF (limite da consulta). Total na UF:{" "}
              {formatIntPt(data.paginacao.total)}.
            </p>
          ) : null}

          {data.meta?.gerado_em ? (
            <p className="mt-4 text-xs text-white/35">
              Cache gerado em {new Date(data.meta.gerado_em).toLocaleString("pt-BR")}.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
