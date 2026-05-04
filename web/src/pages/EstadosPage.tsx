import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { Card, ErrorBanner, Spinner } from "../components/Ui";

type Estado = {
  id: string;
  sigla: string;
  nome: string;
  regiao: string | null;
  populacao: number | null;
  populacao_ano_referencia?: number;
};

type Res = { meta: unknown; estados: Estado[] };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">População por UF</h1>
        <p className="mt-2 text-slate-400">Dados do IBGE (estimativa anual tabela 6579).</p>
      </div>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {data ? (
        <Card title="Estados" subtitle={`${filtrados.length} de ${data.estados.length} exibidos`}>
          <div className="mb-4">
            <label htmlFor="busca" className="sr-only">
              Buscar
            </label>
            <input
              id="busca"
              type="search"
              placeholder="Buscar por sigla, nome ou região…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-sky-500/50 placeholder:text-slate-500 focus:ring-2"
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">UF</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Região</th>
                  <th className="px-4 py-3 text-right font-medium">População</th>
                  <th className="px-4 py-3 text-right font-medium">Ano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtrados.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-sky-300">{e.sigla}</td>
                    <td className="px-4 py-3 text-slate-200">{e.nome}</td>
                    <td className="px-4 py-3 text-slate-400">{e.regiao ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-200">
                      {e.populacao != null ? e.populacao.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {e.populacao_ano_referencia ?? "—"}
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
