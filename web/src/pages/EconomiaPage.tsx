import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Globe,
  Percent,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

type SerieRes = { meta?: { gerado_em?: string }; serie: Record<string, unknown>[] };

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const KPI_ILUSTRATIVOS = [
  {
    title: "PIB",
    value: "+2,9%",
    sub: "+0,4 pp vs 2023",
    trend: "up" as const,
    Icon: BarChart3,
  },
  {
    title: "Taxa de desemprego",
    value: "7,8%",
    sub: "−1,2 pp vs ano anterior",
    trend: "down" as const,
    Icon: TrendingDown,
  },
  {
    title: "Balança comercial",
    value: "+US$ 67,8 bi",
    sub: "+12,3% vs 2023",
    trend: "up" as const,
    Icon: Globe,
  },
  {
    title: "Reservas internacionais",
    value: "US$ 355,2 bi",
    sub: "+2,1% no ano",
    trend: "up" as const,
    Icon: DollarSign,
  },
] as const;

const OUTROS_ILUSTRATIVOS = [
  { title: "Dívida pública / PIB", value: "74,2%", sub: "+1,8 pp" },
  { title: "Produção industrial", value: "+3,1%", sub: "vs ano anterior" },
  { title: "Vendas no varejo", value: "+4,5%", sub: "vs ano anterior" },
  { title: "Confiança do consumidor", value: "92,3", sub: "+5,2 pontos" },
] as const;

function parseDataBr(s: string): Date {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return new Date(NaN);
  const [, dd, mm, yyyy] = m;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function numRow(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Último valor por mês civil (YYYY-MM), ordem cronológica; no máximo `max` meses finais. */
function agregarUltimoPorMes(
  rows: Record<string, unknown>[],
  valueKey: string,
  max = 12,
): { month: string; value: number; sortKey: string }[] {
  const byMonth = new Map<string, { d: Date; v: number }>();
  for (const r of rows) {
    const d = parseDataBr(String(r.data ?? ""));
    if (Number.isNaN(d.getTime())) continue;
    const v = numRow(r[valueKey]);
    if (v == null) continue;
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = byMonth.get(sortKey);
    if (!cur || d >= cur.d) byMonth.set(sortKey, { d, v });
  }
  const sorted = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sortKey, { d, v }]) => ({
      month: MESES_PT[d.getMonth()] ?? sortKey,
      value: v,
      sortKey,
    }));
  return sorted.slice(-max);
}

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

  const serieSel = selic?.serie ?? [];
  const serieCam = cambio?.serie ?? [];

  const selicMensal = useMemo(() => agregarUltimoPorMes(serieSel, "selic_percentual", 12), [serieSel]);
  const cambioMensal = useMemo(() => agregarUltimoPorMes(serieCam, "usd_brl", 12), [serieCam]);

  const ultimoSelic = useMemo(() => {
    for (let i = serieSel.length - 1; i >= 0; i--) {
      const v = numRow(serieSel[i]?.selic_percentual);
      if (v != null) return { valor: v, data: String(serieSel[i]?.data ?? "") };
    }
    return null;
  }, [serieSel]);

  const ultimoUsd = useMemo(() => {
    for (let i = serieCam.length - 1; i >= 0; i--) {
      const v = numRow(serieCam[i]?.usd_brl);
      if (v != null) return { valor: v, data: String(serieCam[i]?.data ?? "") };
    }
    return null;
  }, [serieCam]);

  const deltaSelicPp = useMemo(() => {
    if (selicMensal.length < 2) return null;
    const a = selicMensal[selicMensal.length - 1]?.value;
    const b = selicMensal[selicMensal.length - 2]?.value;
    if (a == null || b == null) return null;
    return a - b;
  }, [selicMensal]);

  const deltaUsdPct = useMemo(() => {
    if (cambioMensal.length < 2) return null;
    const a = cambioMensal[cambioMensal.length - 1]?.value;
    const b = cambioMensal[cambioMensal.length - 2]?.value;
    if (a == null || b == null || b === 0) return null;
    return ((a - b) / b) * 100;
  }, [cambioMensal]);

  const minMaxUsd = useMemo(() => {
    const vals = cambioMensal.map((x) => x.value);
    if (!vals.length) return { min: null as number | null, max: null as number | null };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [cambioMensal]);

  const domainSelic = useMemo(() => {
    const vals = selicMensal.map((x) => x.value);
    if (!vals.length) return [0, 1] as [number, number];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.05, (hi - lo) * 0.15);
    return [lo - pad, hi + pad] as [number, number];
  }, [selicMensal]);

  const domainUsd = useMemo(() => {
    const vals = cambioMensal.map((x) => x.value);
    if (!vals.length) return [0, 1] as [number, number];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.02, (hi - lo) * 0.12);
    return [lo - pad, hi + pad] as [number, number];
  }, [cambioMensal]);

  const tooltipStyle = {
    backgroundColor: "#22222c",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    color: "#fff",
  };

  return (
    <div className="space-y-6 text-[rgba(255,255,255,0.85)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-normal tracking-tight text-white/90">Economia</h1>
        <p className="text-sm text-white/50">Indicadores econômicos e financeiros — Fonte: BCB (séries SGS em cache)</p>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      <p className="text-xs text-white/40">
        Os quatro cartões do topo e a seção &quot;Outros indicadores&quot; são{" "}
        <strong className="font-medium text-white/55">placeholders de layout</strong> (sem integração no pipeline).
        Selic e dólar refletem dados reais do cache.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_ILUSTRATIVOS.map((k) => (
          <div
            key={k.title}
            className="relative rounded-2xl bg-[#161621] p-5 ring-1 ring-white/5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="rounded-lg bg-violet-500/15 p-2 text-violet-400">
                <k.Icon className="h-5 w-5" />
              </div>
              <span className="text-emerald-400/90">
                {k.trend === "up" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums text-white/90">{k.value}</p>
            <p className="mt-1 text-sm text-white/50">{k.title}</p>
            <p className="mt-2 text-xs text-emerald-400/90">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="shrink-0 rounded-lg bg-sky-500/15 p-2 text-sky-400">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white/90">Taxa Selic</h2>
                <p className="text-sm text-white/50">Últimos meses (último dia útil de cada mês na série em cache)</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-semibold tabular-nums text-white/90">
                {ultimoSelic != null
                  ? `${ultimoSelic.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                  : "—"}
              </p>
              <p
                className={`text-sm font-medium tabular-nums ${
                  deltaSelicPp == null
                    ? "text-white/40"
                    : deltaSelicPp >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                }`}
              >
                {deltaSelicPp != null
                  ? `${deltaSelicPp >= 0 ? "+" : ""}${deltaSelicPp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pp (mês a mês)`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            {selicMensal.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={selicMensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillSelic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  />
                  <YAxis
                    domain={domainSelic}
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                    tickFormatter={(v) =>
                      `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`
                    }
                    width={52}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as { month?: string; value?: number };
                      const v = row?.value;
                      if (v == null) return null;
                      return (
                        <div
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm shadow-lg"
                          style={{ backgroundColor: "#22222c", color: "#fff" }}
                        >
                          <p className="text-white/55">{row.month}</p>
                          <p className="font-medium tabular-nums text-white/90">
                            {v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% Selic
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="none"
                    fill="url(#fillSelic)"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={{ fill: "#38bdf8", r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-white/45">Sem pontos Selic.</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 border-t border-white/15 pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-white/45">Último registro (dia)</p>
              <p className="mt-1 font-semibold text-white/90">
                {ultimoSelic
                  ? `${ultimoSelic.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-white/40">{ultimoSelic?.data ?? "—"}</p>
            </div>
            <div>
              <p className="text-white/45">Copom / metas</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                Calendário e comunicados oficiais no site do Banco Central.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="shrink-0 rounded-lg bg-rose-500/15 p-2 text-rose-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white/90">Dólar comercial</h2>
                <p className="text-sm text-white/50">USD/BRL (venda) — agregação mensal da série em cache</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl font-semibold tabular-nums text-white/90">
                {ultimoUsd != null
                  ? `R$ ${ultimoUsd.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
              <p
                className={`text-sm font-medium tabular-nums ${
                  deltaUsdPct == null
                    ? "text-white/40"
                    : deltaUsdPct <= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                }`}
              >
                {deltaUsdPct != null
                  ? `${deltaUsdPct >= 0 ? "+" : ""}${deltaUsdPct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% (mês a mês)`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            {cambioMensal.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cambioMensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="month"
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  />
                  <YAxis
                    domain={domainUsd}
                    stroke="rgba(255,255,255,0.45)"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                    tickFormatter={(v) =>
                      `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    }
                    width={64}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [
                      `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`,
                      "USD/BRL",
                    ]}
                  />
                  <Line
                    type="linear"
                    dataKey="value"
                    stroke="#fb7185"
                    strokeWidth={2}
                    dot={{ fill: "#fb7185", r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-white/45">Sem pontos câmbio.</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 border-t border-white/15 pt-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-white/45">Mínima (período no gráfico)</p>
              <p className="mt-1 font-semibold tabular-nums text-white/90">
                {minMaxUsd.min != null
                  ? `R$ ${minMaxUsd.min.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-white/45">Máxima (período no gráfico)</p>
              <p className="mt-1 font-semibold tabular-nums text-white/90">
                {minMaxUsd.max != null
                  ? `R$ ${minMaxUsd.max.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-base font-semibold text-white/90">Outros indicadores</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTROS_ILUSTRATIVOS.map((o) => (
            <div key={o.title} className="rounded-2xl bg-[#161621] p-5 ring-1 ring-white/5">
              <p className="text-sm text-white/50">{o.title}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-white/90">{o.value}</p>
              <p className="mt-1 text-xs text-white/45">{o.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {selic?.meta?.gerado_em ? (
        <p className="text-xs text-white/35">
          Cache BCB gravado em {new Date(selic.meta.gerado_em).toLocaleString("pt-BR")}.
        </p>
      ) : null}
    </div>
  );
}
