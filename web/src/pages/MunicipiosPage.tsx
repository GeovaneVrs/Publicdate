import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

type Mun = { id: string; nome: string; microrregiao?: string | null; mesorregiao?: string | null };

type Res = {
  meta: unknown;
  uf: string;
  paginacao: { limit: number; offset: number; total: number };
  municipios: Mun[];
};

export function MunicipiosPage() {
  const [input, setInput] = useState("PE");
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (sigla: string) => {
    setLoading(true);
    setErr(null);
    setData(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Municípios por UF</h1>
        <p className="mt-2 text-slate-400">
          Depende do arquivo gerado pelo pipeline para a UF escolhida (padrão PE).
        </p>
      </div>

      <Card title="Consultar" subtitle="Sigla da UF (duas letras)">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="uf" className="mb-1 block text-xs font-medium text-slate-400">
              UF
            </label>
            <input
              id="uf"
              maxLength={2}
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-lg uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-glow transition hover:from-sky-400 hover:to-sky-500"
          >
            Carregar
          </button>
        </form>
      </Card>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <Card
          title={`UF ${data.uf}`}
          subtitle={`Mostrando ${data.municipios.length} de ${data.paginacao.total} (limit ${data.paginacao.limit})`}
        >
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Município</th>
                  <th className="px-4 py-3 font-medium">Microrregião</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.municipios.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.id}</td>
                    <td className="px-4 py-3 text-slate-200">{m.nome}</td>
                    <td className="px-4 py-3 text-slate-400">{m.microrregiao ?? "—"}</td>
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
