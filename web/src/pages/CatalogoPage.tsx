import { BookOpen, Cloud, Database, ExternalLink, Globe, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { docsUrl, fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

type Rota = { metodo: string; rota: string; descricao: string };

type Res = {
  cache_dir: string;
  arquivos_cache: string[];
  rotas: Rota[];
};

type ApiExterna = {
  nome: string;
  categoria: string;
  descricao: string;
  url: string;
  Icon: typeof Database;
};

const APIS_EXTERNAS: ApiExterna[] = [
  {
    nome: "IBGE — Estatísticas",
    categoria: "Demografia",
    descricao: "Dados populacionais, territoriais e socioeconômicos do Brasil.",
    url: "https://servicodados.ibge.gov.br/api/docs",
    Icon: Database,
  },
  {
    nome: "BCB — Séries temporais (SGS)",
    categoria: "Economia",
    descricao: "Indicadores econômicos e financeiros do Banco Central.",
    url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{id}/dados",
    Icon: Globe,
  },
  {
    nome: "INPE — Dados meteorológicos",
    categoria: "Clima",
    descricao: "Previsão do tempo e dados climáticos (serviços históricos/XML).",
    url: "http://servicos.cptec.inpe.br/XML",
    Icon: Cloud,
  },
  {
    nome: "IBGE — Localidades",
    categoria: "Geografia",
    descricao: "Informações sobre estados, municípios e distritos.",
    url: "https://servicodados.ibge.gov.br/api/v1/localidades",
    Icon: MapPin,
  },
  {
    nome: "Portal da Transparência",
    categoria: "Governo",
    descricao: "Dados sobre gastos públicos e receitas (requer chave de acesso).",
    url: "http://api.portaldatransparencia.gov.br/api-de-dados",
    Icon: BookOpen,
  },
];

const EXEMPLOS_EXTERNOS = [
  {
    titulo: "População por localidade",
    fonte: "IBGE",
    descricao: "Projeções e estatísticas populacionais por nível geográfico.",
    path: "/api/v1/projecoes/populacao/{localidade}",
  },
  {
    titulo: "Taxa Selic",
    fonte: "BCB",
    descricao: "Série histórica da taxa Selic (meta Copom).",
    path: "/dados/serie/bcdata.sgs.11/dados",
  },
] as const;

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

  const exemplosBackend = useMemo(() => {
    if (!data?.rotas.length) return [];
    return data.rotas.slice(0, 8).map((r) => ({
      titulo: r.descricao,
      fonte: "API local",
      descricao: `${r.metodo} ${r.rota}`,
      path: `${r.metodo} ${r.rota}`,
    }));
  }, [data]);

  return (
    <div className="space-y-8 text-[rgba(255,255,255,0.85)]">
      <header className="space-y-1">
        <h1 className="text-2xl font-normal tracking-tight text-white/90">Catálogo de APIs</h1>
        <p className="text-sm text-white/50">APIs públicas brasileiras disponíveis para consulta e referência rápida.</p>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      <section>
        <h2 className="mb-4 text-base font-semibold text-white/90">APIs disponíveis</h2>
        <ul className="space-y-3">
          {APIS_EXTERNAS.map((api) => (
            <li
              key={api.nome}
              className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-[#161621] p-4 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:p-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                  <api.Icon className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-medium text-white/90">{api.nome}</h3>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/45">{api.categoria}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">{api.descricao}</p>
                  <a
                    href={api.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 break-all text-sm font-medium text-violet-400 transition hover:text-violet-300"
                  >
                    {api.url}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  </a>
                </div>
              </div>
              <div className="flex shrink-0 flex-row items-center justify-between gap-6 border-t border-white/10 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                <span className="text-sm font-medium text-emerald-400">Ativa</span>
                <span className="rounded border border-white/10 bg-black/25 px-2 py-1 font-mono text-xs text-white/50">
                  GET
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-white/90">Exemplos de uso</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {EXEMPLOS_EXTERNOS.map((ex) => (
            <div
              key={ex.titulo}
              className="rounded-2xl border border-white/15 bg-[#161621] p-5 ring-1 ring-white/5"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="font-medium text-white/90">{ex.titulo}</h3>
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-white/40">{ex.fonte}</span>
              </div>
              <p className="text-sm text-white/50">{ex.descricao}</p>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 px-4 py-3 font-mono text-sm text-violet-300/95 ring-1 ring-white/10">
                {ex.path}
              </pre>
            </div>
          ))}
        </div>

        {exemplosBackend.length ? (
          <>
            <h3 className="mb-3 mt-8 text-sm font-semibold text-white/70">Endpoints desta aplicação</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {exemplosBackend.map((ex) => (
                <div
                  key={ex.path}
                  className="rounded-2xl border border-white/10 bg-[#161621]/80 p-4 ring-1 ring-white/5"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white/85">{ex.titulo}</p>
                    <span className="text-[10px] uppercase text-white/35">{ex.fonte}</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-black/35 px-3 py-2 font-mono text-xs text-sky-300/90 ring-1 ring-white/[0.06]">
                    {ex.path}
                  </pre>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {data ? (
        <section className="rounded-2xl border border-white/15 bg-[#161621] p-5 ring-1 ring-white/5">
          <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white/90">Cache e documentação</h2>
              <p className="mt-1 text-xs text-white/45">
                Arquivos gerados pelo pipeline em <span className="font-mono text-white/60">{data.cache_dir}</span>
              </p>
            </div>
            <a
              href={docsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20"
            >
              Swagger / OpenAPI
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto font-mono text-xs text-white/45">
            {data.arquivos_cache.length ? (
              data.arquivos_cache.map((f) => (
                <li key={f} className="rounded px-2 py-1.5 hover:bg-white/[0.04]">
                  {f}
                </li>
              ))
            ) : (
              <li className="text-white/40">Nenhum arquivo — rode o pipeline.</li>
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
