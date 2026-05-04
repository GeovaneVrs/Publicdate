import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner } from "../components/Ui";

const cards = [
  {
    to: "/populacao/estados",
    title: "População por UF",
    desc: "Estimativa IBGE por estado, região e ano de referência.",
    accent: "from-emerald-500/20 to-teal-600/10",
  },
  {
    to: "/populacao/municipios",
    title: "Municípios",
    desc: "Lista por UF gerada pelo pipeline (paginada na API).",
    accent: "from-violet-500/20 to-purple-600/10",
  },
  {
    to: "/inflacao",
    title: "Inflação",
    desc: "Série IPCA mensal (BCB / SGS).",
    accent: "from-amber-500/20 to-orange-600/10",
  },
  {
    to: "/economia",
    title: "Economia",
    desc: "Selic e câmbio USD em séries recentes.",
    accent: "from-sky-500/20 to-blue-600/10",
  },
  {
    to: "/clima",
    title: "Clima",
    desc: "Atual + previsão 7 dias (Open-Meteo).",
    accent: "from-cyan-500/20 to-sky-600/10",
  },
  {
    to: "/catalogo",
    title: "Catálogo",
    desc: "Arquivos em cache e rotas expostas.",
    accent: "from-rose-500/20 to-pink-600/10",
  },
];

export function HomePage() {
  const [health, setHealth] = useState<"ok" | "err" | "load">("load");
  const [err, setErr] = useState<string | null>(null);

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
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-sky-950/40 p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <p className="text-sm font-medium uppercase tracking-widest text-sky-400/90">
          Painel de dados públicos
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          Brasil em indicadores
          <span className="text-sky-400">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Interface para a API Node + cache gerado pelo pipeline Python. Rode{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-sm text-sky-200">
            python pipeline.py
          </code>{" "}
          e{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-sm text-sky-200">
            npm run dev
          </code>{" "}
          na API antes de explorar os dados.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {health === "load" ? (
            <span className="h-3 w-3 animate-pulse rounded-full bg-sky-500/60" aria-hidden />
          ) : null}
          {health === "ok" ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              API online
            </span>
          ) : null}
          {health === "err" && err ? <ErrorBanner message={err} /> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${c.accent} p-6 transition hover:border-sky-500/40 hover:shadow-glow`}
          >
            <h2 className="font-display text-lg font-semibold text-white group-hover:text-sky-200">
              {c.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 group-hover:text-slate-300">
              {c.desc}
            </p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-sky-400">
              Abrir →
            </span>
          </Link>
        ))}
      </div>

      <Card title="Como usar" subtitle="Fluxo rápido">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Pasta <code className="text-sky-300">data-service</code>:{" "}
            <code className="text-sky-300">python pipeline.py</code>
          </li>
          <li>
            Pasta <code className="text-sky-300">api</code>:{" "}
            <code className="text-sky-300">npm run dev</code> (porta 3000)
          </li>
          <li>
            Pasta <code className="text-sky-300">web</code>:{" "}
            <code className="text-sky-300">npm run dev</code> (porta 5173, proxy → API)
          </li>
        </ol>
      </Card>
    </div>
  );
}
