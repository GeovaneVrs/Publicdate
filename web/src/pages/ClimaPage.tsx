import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

const CIDADES = [
  { slug: "recife", label: "Recife" },
  { slug: "salvador", label: "Salvador" },
  { slug: "fortaleza", label: "Fortaleza" },
  { slug: "sao_paulo", label: "São Paulo" },
  { slug: "rio_de_janeiro", label: "Rio de Janeiro" },
  { slug: "belo_horizonte", label: "Belo Horizonte" },
  { slug: "curitiba", label: "Curitiba" },
  { slug: "manaus", label: "Manaus" },
  { slug: "brasilia", label: "Brasília" },
];

type Atual = {
  meta: unknown;
  clima: Record<string, unknown>;
};

type Prev = {
  meta: unknown;
  previsao: { dias?: Record<string, unknown>[] };
};

export function ClimaPage() {
  const [cidade, setCidade] = useState("recife");
  const [atual, setAtual] = useState<Atual | null>(null);
  const [prev, setPrev] = useState<Prev | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setAtual(null);
      setPrev(null);
      try {
        const [a, p] = await Promise.all([
          fetchJson<Atual>(`/clima/${encodeURIComponent(cidade)}`),
          fetchJson<Prev>(`/clima/${encodeURIComponent(cidade)}/previsao`),
        ]);
        if (!cancel) {
          setAtual(a);
          setPrev(p);
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
  }, [cidade]);

  const c = atual?.clima;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Clima</h1>
        <p className="mt-2 text-slate-400">Open-Meteo — atual e previsão de 7 dias (cache do pipeline).</p>
      </div>

      <Card title="Cidade" subtitle="Somente cidades geradas no pipeline">
        <select
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500/50"
        >
          {CIDADES.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.label}
            </option>
          ))}
        </select>
      </Card>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {c ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Agora" subtitle={String(c.cidade ?? cidade)}>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-white/5 p-4">
                <dt className="text-slate-500">Temperatura</dt>
                <dd className="mt-1 font-display text-3xl font-bold text-sky-300">
                  {c.temperatura_c != null ? `${c.temperatura_c}°C` : "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <dt className="text-slate-500">Umidade</dt>
                <dd className="mt-1 font-display text-3xl font-bold text-cyan-300">
                  {c.umidade_percentual != null ? `${c.umidade_percentual}%` : "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <dt className="text-slate-500">Vento</dt>
                <dd className="mt-1 text-lg text-slate-200">
                  {c.vento_kmh != null ? `${c.vento_kmh} km/h` : "—"}
                </dd>
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <dt className="text-slate-500">Atualizado</dt>
                <dd className="mt-1 text-slate-200">{String(c.atualizado_em ?? "—")}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Próximos dias" subtitle="Máx / mín">
            <ul className="space-y-2">
              {(prev?.previsao?.dias ?? []).map((d) => (
                <li
                  key={String(d.data)}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2 text-sm"
                >
                  <span className="text-slate-400">{String(d.data)}</span>
                  <span className="tabular-nums text-slate-200">
                    <span className="text-sky-300">{String(d.temp_max_c ?? "—")}°</span>
                    <span className="mx-1 text-slate-600">/</span>
                    <span className="text-slate-400">{String(d.temp_min_c ?? "—")}°</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
