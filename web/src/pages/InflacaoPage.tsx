import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

type Ponto = {
  data: string;
  ipca_mensal_percentual: number;
};

type Res = {
  meta?: { gerado_em?: string };
  paginacao: { limit: number; offset: number; total: number };
  serie: Ponto[];
};

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const SETORES_ILUSTRATIVOS = [
  { sector: "Alimentação e bebidas", variation: "+6,82%", weight: "23,12%" },
  { sector: "Habitação", variation: "+4,23%", weight: "15,03%" },
  { sector: "Transportes", variation: "+3,87%", weight: "18,77%" },
  { sector: "Saúde e cuidados pessoais", variation: "+5,92%", weight: "11,09%" },
  { sector: "Despesas pessoais", variation: "+4,12%", weight: "9,94%" },
  { sector: "Educação", variation: "+5,68%", weight: "6,01%" },
  { sector: "Comunicação", variation: "+2,34%", weight: "4,70%" },
  { sector: "Vestuário", variation: "+3,45%", weight: "5,21%" },
  { sector: "Artigos de residência", variation: "+2,98%", weight: "4,69%" },
] as const;

const LINE_COLOR = "#5250f3";

function parseDataBr(s: string): Date {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return new Date(NaN);
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

/** IPCA acumulado em janela: ∏(1 + r_i/100) − 1, em %. */
function ipcaAcumuladoPercent(mensais: number[]): number {
  if (!mensais.length) return 0;
  const fator = mensais.reduce((acc, r) => acc * (1 + r / 100), 1);
  return (fator - 1) * 100;
}

function formatPct(value: number, frac = 2) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: frac, maximumFractionDigits: frac })}%`;
}

function formatDeltaPp(value: number) {
  const s = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = value > 0 ? "+" : "";
  return `${sign}${s} pp`;
}

export function InflacaoPage() {
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const j = await fetchJson<Res>("/inflacao?limit=120&offset=0");
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

  const serie = data?.serie ?? [];
  const ultimos12 = useMemo(() => serie.slice(-12), [serie]);
  const ultimos24 = useMemo(() => serie.slice(-24), [serie]);

  const chartRows = useMemo(
    () =>
      ultimos12.map((p) => {
        const d = parseDataBr(p.data);
        const idx = Number.isNaN(d.getTime()) ? 0 : d.getMonth();
        return {
          month: MESES_PT[idx] ?? p.data.slice(0, 5),
          value: p.ipca_mensal_percentual,
          data: p.data,
        };
      }),
    [ultimos12],
  );

  const acum12 = useMemo(() => {
    const vals = ultimos12.map((p) => p.ipca_mensal_percentual);
    return ipcaAcumuladoPercent(vals);
  }, [ultimos12]);

  const acum12Anterior = useMemo(() => {
    if (ultimos24.length < 24) return null;
    const vals = ultimos24.slice(0, 12).map((p) => p.ipca_mensal_percentual);
    return ipcaAcumuladoPercent(vals);
  }, [ultimos24]);

  const deltaPp = acum12Anterior != null ? acum12 - acum12Anterior : null;

  const yDomain = useMemo(() => {
    if (!chartRows.length) return [-0.2, 0.9];
    const vals = chartRows.map((r) => r.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.08, (hi - lo) * 0.2);
    return [lo - pad, hi + pad] as [number, number];
  }, [chartRows]);

  return (
    <div className="space-y-6 text-[rgba(255,255,255,0.85)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-normal tracking-tight text-white/90">Inflação</h1>
        <p className="text-sm text-white/50">Indicadores de inflação — Fonte: IBGE/BCB</p>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data && chartRows.length ? (
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
            <div className="mb-4 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-base font-semibold text-white/90">IPCA — Últimos 12 meses</h2>
                <p className="text-sm text-white/50">Índice Nacional de Preços ao Consumidor Amplo (mensal %)</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-semibold tabular-nums text-white/90">{formatPct(acum12)}</div>
                <div
                  className={`text-sm font-medium tabular-nums ${
                    deltaPp == null
                      ? "text-white/40"
                      : deltaPp < 0
                        ? "text-emerald-400"
                        : deltaPp > 0
                          ? "text-rose-400"
                          : "text-white/45"
                  }`}
                >
                  {deltaPp != null ? formatDeltaPp(deltaPp) : "— (precisa de 24 meses na série)"}
                </div>
                <p className="mt-1 text-xs text-white/35">Acumulado 12 meses vs. 12 meses anteriores</p>
              </div>
            </div>

            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  />
                  <YAxis
                    domain={yDomain}
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                    tickFormatter={(v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#22222c",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { data?: string; month?: string } | undefined;
                      return p?.data ?? p?.month ?? "";
                    }}
                    formatter={(value: number | string) => [
                      typeof value === "number"
                        ? `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                        : String(value),
                      "IPCA a.m.",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={LINE_COLOR}
                    strokeWidth={2}
                    dot={{ fill: LINE_COLOR, r: 4 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {data.meta?.gerado_em ? (
              <p className="mt-4 text-xs text-white/35">
                Cache gerado em {new Date(data.meta.gerado_em).toLocaleString("pt-BR")}.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
            <div className="mb-4 border-b border-white/10 pb-4">
              <h2 className="text-base font-semibold text-white/90">Variação por setor (12 meses)</h2>
              <p className="mt-1 text-xs text-white/40">
                Tabela ilustrativa para o layout — pesos e variações por grupo não vêm da API neste projeto.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-base">
                <thead>
                  <tr className="border-b border-white/15 text-sm font-bold text-white/50">
                    <th className="py-2 pr-6 text-left">Setor</th>
                    <th className="py-2 pr-6 text-right">Variação</th>
                    <th className="py-2 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {SETORES_ILUSTRATIVOS.map((row) => (
                    <tr
                      key={row.sector}
                      className="border-b border-white/[0.06] transition hover:bg-white/[0.02]"
                    >
                      <td className="py-3 pr-6 text-white/90">{row.sector}</td>
                      <td className="py-3 pr-6 text-right font-medium tabular-nums text-emerald-400">
                        {row.variation}
                      </td>
                      <td className="py-3 text-right tabular-nums text-white/50">{row.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {!loading && !err && data && !chartRows.length ? (
        <p className="text-sm text-white/50">Nenhum ponto na série de inflação.</p>
      ) : null}
    </div>
  );
}
