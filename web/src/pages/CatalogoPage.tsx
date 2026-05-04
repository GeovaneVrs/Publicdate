import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

type Rota = { metodo: string; rota: string; descricao: string };

type Res = {
  cache_dir: string;
  arquivos_cache: string[];
  rotas: Rota[];
};

export function CatalogoPage() {
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const j = await fetchJson<Res>("/catalogo");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Catálogo</h1>
        <p className="mt-2 text-slate-400">Rotas da API e arquivos presentes em <code className="text-sky-300">data/cache</code>.</p>
      </div>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Rotas" subtitle="Referência rápida">
            <ul className="space-y-2 text-sm">
              {data.rotas.map((r) => (
                <li
                  key={r.rota + r.metodo}
                  className="flex flex-col rounded-lg border border-white/5 bg-slate-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <code className="text-sky-300">
                    {r.metodo} {r.rota}
                  </code>
                  <span className="text-slate-500 sm:text-right">{r.descricao}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Arquivos em cache" subtitle={data.cache_dir}>
            <ul className="max-h-[480px] space-y-1 overflow-y-auto font-mono text-xs text-slate-400">
              {data.arquivos_cache.length ? (
                data.arquivos_cache.map((f) => (
                  <li key={f} className="rounded px-2 py-1 hover:bg-white/5">
                    {f}
                  </li>
                ))
              ) : (
                <li className="text-slate-500">Nenhum arquivo — rode o pipeline.</li>
              )}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
