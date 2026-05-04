import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

type Ponto = {
  data: string;
  ipca_mensal_percentual: number;
};

type Res = {
  meta: unknown;
  paginacao: { limit: number; offset: number; total: number };
  serie: Ponto[];
};

export function InflacaoPage() {
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const j = await fetchJson<Res>("/inflacao?limit=36&offset=0");
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

  const reversed = data?.serie ? [...data.serie].reverse() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Inflação (IPCA)</h1>
        <p className="mt-2 text-slate-400">Série mensal — Banco Central (SGS 433).</p>
      </div>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <Card
          title="Últimos meses"
          subtitle={`${data.serie.length} pontos (total na API: ${data.paginacao.total})`}
        >
          <div className="mb-6 flex flex-wrap gap-1">
            {reversed.slice(-24).map((p) => (
              <div
                key={p.data}
                className="flex h-24 w-5 flex-col justify-end rounded-md bg-slate-800/80"
                title={`${p.data}: ${p.ipca_mensal_percentual}%`}
              >
                <div
                  className="rounded-md bg-gradient-to-t from-sky-600 to-sky-400"
                  style={{
                    height: `${Math.min(100, Math.max(8, p.ipca_mensal_percentual * 40))}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 text-right font-medium">IPCA % a.m.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...data.serie].reverse().map((p) => (
                  <tr key={p.data} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-300">{p.data}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-amber-300">
                      {p.ipca_mensal_percentual.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
