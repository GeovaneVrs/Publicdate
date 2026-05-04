import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

type Estado = {
  id: string;
  sigla: string;
  nome: string;
  regiao: string | null;
  populacao: number | null;
  populacao_ano_referencia?: number;
};

type Res = {
  meta?: { gerado_em?: string; pipeline_versao?: string };
  estados: Estado[];
};

function formatIntPt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatMilhoes(total: number) {
  if (total >= 1e6) {
    const m = total / 1e6;
    return `${m.toFixed(1).replace(".", ",")} milhões`;
  }
  return formatIntPt(total);
}

export function EstadosPage() {
  const [data, setData] = useState<Res | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const j = await fetchJson<Res>("/populacao/estados");
        if (!cancel) setData(j);
      } catch (e) {
        if (!cancel) setErr(e instanceof Error ? e.message : "Erro");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const totalBrasil = useMemo(
    () => data?.estados.reduce((a, e) => a + (e.populacao ?? 0), 0) ?? 0,
    [data],
  );

  const anoRef = useMemo(() => {
    const y = data?.estados.find((e) => e.populacao_ano_referencia != null)?.populacao_ano_referencia;
    return y ?? new Date().getFullYear();
  }, [data]);

  const filtrados = useMemo(() => {
    if (!data?.estados) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data.estados;
    return data.estados.filter(
      (e) =>
        e.sigla.toLowerCase().includes(s) ||
        e.nome.toLowerCase().includes(s) ||
        (e.regiao && e.regiao.toLowerCase().includes(s)),
    );
  }, [data, q]);

  const comPop = useMemo(
    () => filtrados.filter((e) => e.populacao != null && e.populacao > 0),
    [filtrados],
  );

  const maiorUf = useMemo(() => {
    if (!comPop.length) return null;
    return comPop.reduce((a, b) => ((a.populacao ?? 0) >= (b.populacao ?? 0) ? a : b));
  }, [comPop]);

  const mediaPorUf = useMemo(() => {
    if (!data?.estados.length || totalBrasil <= 0) return null;
    const n = data.estados.filter((e) => e.populacao != null).length;
    return n ? totalBrasil / n : null;
  }, [data, totalBrasil]);

  const pctMaior = useMemo(() => {
    if (!maiorUf?.populacao || totalBrasil <= 0) return null;
    return (maiorUf.populacao / totalBrasil) * 100;
  }, [maiorUf, totalBrasil]);

  return (
    <div className="space-y-6 text-[rgba(255,255,255,0.85)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-normal tracking-tight text-white/90">População</h1>
        <p className="text-sm text-white/50">Dados populacionais por estado — Fonte: IBGE</p>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-white/90">
              População por Estado ({anoRef})
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <label className="relative flex min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="search"
                  placeholder="Buscar estado ou UF…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:ring-1 focus:ring-violet-500/50"
                />
              </label>
              <p className="shrink-0 text-sm text-white/50">
                Total: <span className="text-white/80">{formatMilhoes(totalBrasil)}</span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left text-base">
              <thead>
                <tr className="border-b border-white/15 text-sm font-bold text-white/50">
                  <th className="w-[36%] py-2 pr-4">Estado</th>
                  <th className="w-[22%] py-2 pr-4 text-right">População</th>
                  <th className="w-[18%] py-2 pr-4 text-right">% Nacional</th>
                  <th className="w-[24%] py-2 text-right">Densidade (hab/km²)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e) => {
                  const pct =
                    e.populacao != null && totalBrasil > 0
                      ? (e.populacao / totalBrasil) * 100
                      : null;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-white/[0.05] font-normal transition hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-white/90">{e.nome}</span>
                        <span className="ml-2 text-sm text-white/35">({e.sigla})</span>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-white/90">
                        {e.populacao != null ? formatIntPt(e.populacao) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-white/50">
                        {pct != null
                          ? `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                          : "—"}
                      </td>
                      <td
                        className="py-3 text-right tabular-nums text-white/40"
                        title="Área territorial não exposta pela API neste projeto."
                      >
                        —
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-6 border-t border-white/15 pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-white/50">UF mais populosa</p>
              <p className="mt-1 text-xl font-semibold text-white/90">
                {maiorUf ? (
                  <>
                    {maiorUf.sigla}
                    {pctMaior != null && (
                      <span className="ml-2 text-base font-normal text-white/50">
                        ({pctMaior.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/50">Média populacional / UF</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">
                {mediaPorUf != null ? `${formatIntPt(Math.round(mediaPorUf))} hab.` : "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/50">Registros exibidos</p>
              <p className="mt-1 text-xl font-semibold text-white/90">
                {filtrados.length}
                <span className="text-base font-normal text-white/45"> / {data.estados.length} UFs</span>
              </p>
            </div>
          </div>

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
