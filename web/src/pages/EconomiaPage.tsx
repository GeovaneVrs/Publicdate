import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

type SerieRes = { meta: unknown; serie: Record<string, unknown>[] };

export function EconomiaPage() {
  const [selic, setSelic] = useState<SerieRes | null>(null);
  const [cambio, setCambio] = useState<SerieRes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          fetchJson<SerieRes>("/economia/selic"),
          fetchJson<SerieRes>("/economia/cambio"),
        ]);
        if (!cancel) {
          setSelic(s);
          setCambio(c);
        }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Economia</h1>
        <p className="mt-2 text-slate-400">Séries recentes do SGS (Banco Central).</p>
      </div>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Selic" subtitle="SGS 11 — taxa (últimos registros)">
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-400">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {selic?.serie
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((row, i) => (
                    <tr key={`${row.data}-${i}`} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-2 text-slate-300">{String(row.data)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-sky-300">
                        {String(row.selic_percentual ?? row.valor ?? "—")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Câmbio USD" subtitle="SGS 1 — R$ por US$ (venda)">
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-400">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2 text-right">R$ / US$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cambio?.serie
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((row, i) => (
                    <tr key={`${row.data}-${i}`} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-2 text-slate-300">{String(row.data)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">
                        {String(row.usd_brl ?? row.valor ?? "—")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
