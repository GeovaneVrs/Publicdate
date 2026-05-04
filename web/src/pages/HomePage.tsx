import { useEffect, useState } from "react";
import { Activity, LineChart, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchJson } from "../lib/api";
import { ErrorBanner } from "../components/Ui";

type Estado = { populacao: number | null };
type EstadosRes = { estados: Estado[] };
type MunRes = { paginacao: { total: number } };
type InfRes = {
  serie: { data: string; ipca_mensal_percentual: number }[];
  paginacao: { total: number };
};
type SerieRes = { serie: Record<string, unknown>[] };

type Kpis = {
  popSum: number | null;
  munTotal: number | null;
  ipcaLast: number | null;
  ipcaPrev: number | null;
  selicLast: number | null;
};

function formatPop(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")} milhões`;
  return n.toLocaleString("pt-BR");
}

function KpiCard({
  Icon,
  delta,
  deltaTone,
  value,
  label,
  to,
}: {
  Icon: LucideIcon;
  delta: string;
  deltaTone: "green" | "red" | "muted";
  value: string;
  label: string;
  to: string;
}) {
  const deltaCls =
    deltaTone === "green"
      ? "text-[#47fc74]"
      : deltaTone === "red"
        ? "text-[#cf2828]"
        : "text-white/50";
  return (
    <Link
      to={to}
      className="rounded-2xl bg-[#161621] p-4 transition hover:ring-1 hover:ring-violet-500/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#161621] ring-1 ring-white/10">
          <Icon className="h-5 w-5 text-violet-300/90" strokeWidth={1.75} aria-hidden />
        </div>
        <span className={`text-sm ${deltaCls}`}>{delta}</span>
      </div>
      <p className="mt-3 text-xl font-semibold text-white/90">{value}</p>
      <p className="mt-1 text-sm text-white/50">{label}</p>
    </Link>
  );
}

export function HomePage() {
  const [health, setHealth] = useState<"ok" | "err" | "load">("load");
  const [err, setErr] = useState<string | null>(null);
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        await fetchJson<{ ok: boolean }>("/health");
        if (!cancel) setHealth("ok");
      } catch (e) {
        if (!cancel) {
          setHealth("err");
          setErr(e instanceof Error ? e.message : "Falha ao contatar a API");
        }
      }

      try {
        const [est, mun, inf, sel] = await Promise.all([
          fetchJson<EstadosRes>("/populacao/estados"),
          fetchJson<MunRes>("/populacao/municipios/PE?limit=1&offset=0").catch(() => null),
          fetchJson<InfRes>("/inflacao?limit=120&offset=0"),
          fetchJson<SerieRes>("/economia/selic"),
        ]);
        if (cancel) return;
        const popSum =
          est.estados?.reduce((a, e) => a + (e.populacao ?? 0), 0) || null;
        const serie = inf.serie ?? [];
        const last = serie.length ? serie[serie.length - 1] : null;
        const prev = serie.length > 1 ? serie[serie.length - 2] : null;
        const selArr = sel.serie ?? [];
        const selLast = selArr.length ? Number(selArr[selArr.length - 1].selic_percentual) : NaN;
        setKpis({
          popSum,
          munTotal: mun?.paginacao?.total ?? null,
          ipcaLast: last?.ipca_mensal_percentual ?? null,
          ipcaPrev: prev?.ipca_mensal_percentual ?? null,
          selicLast: Number.isFinite(selLast) ? selLast : null,
        });
      } catch {
        if (!cancel) setKpis(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const ipcaDiff =
    kpis?.ipcaLast != null && kpis?.ipcaPrev != null ? kpis.ipcaLast - kpis.ipcaPrev : null;
  const ipcaDeltaStr =
    ipcaDiff === null
      ? "—"
      : `${ipcaDiff >= 0 ? "+" : ""}${ipcaDiff.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} p.p.`;
  const ipcaTone: "green" | "red" | "muted" =
    ipcaDiff === null ? "muted" : ipcaDiff >= 0 ? "green" : "red";

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-normal text-white/90">Dados Públicos BR</h1>
          {health === "load" ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" aria-hidden />
          ) : null}
          {health === "ok" ? (
            <span className="rounded-full border border-[#47fc74]/40 bg-[#47fc74]/10 px-2 py-0.5 text-xs text-[#47fc74]">
              API online
            </span>
          ) : null}
        </div>
        <p className="text-sm text-white/50">Painel de visualização de dados públicos brasileiros</p>
        {health === "err" && err ? <ErrorBanner message={err} /> : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          Icon={Users}
          delta="IBGE"
          deltaTone="muted"
          value={kpis?.popSum != null ? formatPop(kpis.popSum) : "—"}
          label="População total (soma UF)"
          to="/populacao/estados"
        />
        <KpiCard
          Icon={MapPin}
          delta="Total"
          deltaTone="muted"
          value={kpis?.munTotal != null ? kpis.munTotal.toLocaleString("pt-BR") : "—"}
          label="Municípios (PE, cache)"
          to="/populacao/municipios"
        />
        <KpiCard
          Icon={LineChart}
          delta={ipcaDeltaStr}
          deltaTone={ipcaTone}
          value={
            kpis?.ipcaLast != null
              ? `${kpis.ipcaLast.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
              : "—"
          }
          label="IPCA (último mês na série)"
          to="/inflacao"
        />
        <KpiCard
          Icon={Activity}
          delta="—"
          deltaTone="muted"
          value={
            kpis?.selicLast != null
              ? `${kpis.selicLast.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
              : "—"
          }
          label="Selic (último ponto)"
          to="/economia"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5">
          <h2 className="text-base font-semibold text-white/90">Sobre o painel</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            Este painel consome a API do repositório: dados públicos do IBGE, indicadores do Banco Central
            (SGS), clima via Open-Meteo e amostra do catálogo dados.gov.br. Navegue pela barra lateral para
            explorar população, municípios, inflação, economia e clima.
          </p>
          <p className="mt-2 text-sm text-white/50">
            Rode <code className="text-violet-300">python pipeline.py</code> no{" "}
            <code className="text-violet-300">data-service</code> e mantenha a API em{" "}
            <code className="text-violet-300">npm run dev</code> na pasta <code className="text-violet-300">api</code>
            .
          </p>
        </article>
        <article className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5">
          <h2 className="text-base font-semibold text-white/90">Fontes de dados</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li>
              <p className="font-medium text-white/90">IBGE</p>
              <p className="text-white/50">População por UF e municípios por UF.</p>
            </li>
            <li>
              <p className="font-medium text-white/90">Banco Central</p>
              <p className="text-white/50">IPCA e séries SGS (Selic, câmbio).</p>
            </li>
            <li>
              <p className="font-medium text-white/90">Open-Meteo</p>
              <p className="text-white/50">Clima atual e previsão (demonstração).</p>
            </li>
          </ul>
        </article>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white/40">Acesso rápido</h2>
        <div className="flex flex-wrap gap-2">
          {[
            ["/populacao/estados", "População"],
            ["/populacao/municipios", "Municípios"],
            ["/inflacao", "Inflação"],
            ["/economia", "Economia"],
            ["/clima", "Clima"],
            ["/catalogo", "Catálogo"],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className="rounded-lg border border-white/10 bg-[#161621] px-3 py-2 text-sm text-white/70 transition hover:border-violet-500/40 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
