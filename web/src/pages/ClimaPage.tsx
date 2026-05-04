import { Cloud, CloudFog, CloudRain, Droplets, Eye, Sun, Wind } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { ErrorBanner, Spinner } from "../components/Ui";

const CIDADES = [
  { slug: "brasilia", label: "Brasília" },
  { slug: "fortaleza", label: "Fortaleza" },
  { slug: "sao_paulo", label: "São Paulo" },
  { slug: "rio_de_janeiro", label: "Rio de Janeiro" },
  { slug: "salvador", label: "Salvador" },
  { slug: "belo_horizonte", label: "Belo Horizonte" },
  { slug: "curitiba", label: "Curitiba" },
  { slug: "manaus", label: "Manaus" },
  { slug: "recife", label: "Recife" },
] as const;

/** Capitais exibidas na grade (2×4), alinhado ao layout do Figma. */
const GRADE_CAPITAIS = [
  { slug: "brasilia", label: "Brasília" },
  { slug: "fortaleza", label: "Fortaleza" },
  { slug: "sao_paulo", label: "São Paulo" },
  { slug: "rio_de_janeiro", label: "Rio de Janeiro" },
  { slug: "salvador", label: "Salvador" },
  { slug: "belo_horizonte", label: "Belo Horizonte" },
  { slug: "curitiba", label: "Curitiba" },
  { slug: "manaus", label: "Manaus" },
] as const;

type ClimaAtual = {
  cidade?: string;
  atualizado_em?: string;
  temperatura_c?: number;
  umidade_percentual?: number;
  codigo_tempo?: number;
  vento_kmh?: number;
};

type Atual = { meta?: { gerado_em?: string }; clima: ClimaAtual };

type DiaPrev = {
  data: string;
  temp_max_c?: number | null;
  temp_min_c?: number | null;
  precipitacao_mm?: number | null;
  codigo_tempo?: number | null;
};

type Prev = {
  meta?: unknown;
  previsao: { dias?: DiaPrev[]; cidade?: string };
};

function labelTempo(codigo: number | null | undefined): string {
  if (codigo == null) return "Tempo";
  const c = codigo;
  if (c === 0) return "Ensolarado";
  if (c <= 3) return c === 1 ? "Pred. limpo" : c === 2 ? "Parcial nublado" : "Nublado";
  if (c <= 48) return "Neblina";
  if (c <= 57) return "Garoa";
  if (c <= 67) return "Chuva";
  if (c <= 77) return "Neve";
  if (c <= 82) return "Pancadas";
  if (c <= 86) return "Chuva forte";
  if (c <= 99) return "Tempestade";
  return "Variável";
}

function IconeTempo({ codigo, className }: { codigo: number | null | undefined; className?: string }) {
  const cn = className ?? "h-8 w-8 text-violet-400";
  if (codigo == null) return <Cloud className={cn} />;
  const c = codigo;
  if (c === 0) return <Sun className={cn} />;
  if (c <= 3) return <Cloud className={cn} />;
  if (c <= 48) return <CloudFog className={cn} />;
  if (c <= 67) return <CloudRain className={cn} />;
  if (c <= 77) return <CloudRain className={cn} />;
  return <CloudRain className={cn} />;
}

function formatarDiaSemanaCurto(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(".", "");
}

function formatarDataCurta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(d);
}

function pontoOrvalhoAprox(tC: number, rh: number): number | null {
  if (Number.isNaN(tC) || Number.isNaN(rh)) return null;
  const a = (100 - rh) / 5;
  return Math.round((tC - a) * 10) / 10;
}

function formatarAtualizado(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function ClimaPage() {
  const [cidade, setCidade] = useState("brasilia");
  const [atual, setAtual] = useState<Atual | null>(null);
  const [prev, setPrev] = useState<Prev | null>(null);
  const [capitais, setCapitais] = useState<Record<string, ClimaAtual | null>>({});
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(true);

  const carregarGrade = useCallback(async () => {
    setLoadingGrade(true);
    const next: Record<string, ClimaAtual | null> = {};
    await Promise.all(
      GRADE_CAPITAIS.map(async ({ slug }) => {
        try {
          const a = await fetchJson<Atual>(`/clima/${encodeURIComponent(slug)}`);
          next[slug] = a.clima;
        } catch {
          next[slug] = null;
        }
      }),
    );
    setCapitais(next);
    setLoadingGrade(false);
  }, []);

  useEffect(() => {
    void carregarGrade();
  }, [carregarGrade]);

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
  const dias = prev?.previsao?.dias ?? [];
  const labelCidade = useMemo(
    () => CIDADES.find((x) => x.slug === cidade)?.label ?? cidade,
    [cidade],
  );

  const vento = c?.vento_kmh;
  const umid = c?.umidade_percentual;
  const temp = c?.temperatura_c;
  const orvalho =
    temp != null && umid != null ? pontoOrvalhoAprox(temp, umid) : null;

  return (
    <div className="space-y-6 text-[rgba(255,255,255,0.85)]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-normal tracking-tight text-white/90">Clima</h1>
          <p className="text-sm text-white/50">
            Previsão do tempo e dados meteorológicos — Fonte: Open-Meteo (referência INPE/INMET para uso
            institucional).
          </p>
        </div>
        <div className="shrink-0">
          <label htmlFor="clima-cidade" className="mb-1 block text-xs text-white/45">
            Cidade (previsão 7 dias)
          </label>
          <select
            id="clima-cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="w-full min-w-[200px] rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:ring-1 focus:ring-violet-500/50 sm:w-56"
          >
            {CIDADES.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {loading ? <Spinner /> : null}
      {err ? <ErrorBanner message={err} /> : null}

      {c ? (
        <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white/90">Previsão 7 dias — {labelCidade}</h2>
              <p className="mt-1 text-sm text-white/50">
                Atualizado: <span className="text-white/70">{formatarAtualizado(c.atualizado_em)}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/55">
              <span className="inline-flex items-center gap-2">
                <Wind className="h-4 w-4 text-violet-400" />
                <span>{vento != null ? `${Math.round(vento)} km/h` : "—"}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Droplets className="h-4 w-4 text-violet-400" />
                <span>{umid != null ? `${Math.round(umid)}%` : "—"}</span>
              </span>
            </div>
          </div>

          {dias.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {dias.map((d) => {
              const max = d.temp_max_c != null ? Math.round(Number(d.temp_max_c)) : null;
              const min = d.temp_min_c != null ? Math.round(Number(d.temp_min_c)) : null;
              const chuva = d.precipitacao_mm != null ? Number(d.precipitacao_mm) : null;
              const nomeDia = formatarDiaSemanaCurto(String(d.data));
              const dataFmt = formatarDataCurta(String(d.data));
              return (
                <div
                  key={String(d.data)}
                  className="flex flex-col items-center rounded-xl border border-white/10 bg-black/20 px-2 py-4 text-center"
                >
                  <p className="text-xs capitalize text-white/55">
                    {nomeDia} {dataFmt}
                  </p>
                  <div className="my-3 flex h-12 items-center justify-center">
                    <IconeTempo codigo={d.codigo_tempo ?? undefined} className="h-9 w-9 text-violet-400" />
                  </div>
                  <p className="text-xl font-semibold tabular-nums text-white/90">
                    {max != null ? `${max}°` : "—"}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-white/45">
                    {min != null && max != null ? `${min}° / ${max}°` : "—"}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-white/45">
                    <Droplets className="h-3.5 w-3.5" />
                    {chuva != null ? `${chuva.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mm` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          ) : (
            <p className="py-6 text-center text-sm text-white/45">Nenhum dia de previsão no cache.</p>
          )}

          {atual?.meta?.gerado_em ? (
            <p className="mt-4 text-xs text-white/35">
              Cache gerado em {new Date(atual.meta.gerado_em).toLocaleString("pt-BR")}.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl bg-[#161621] p-4 ring-1 ring-white/5 md:p-6">
        <div className="mb-4 border-b border-white/10 pb-4">
          <h2 className="text-base font-semibold text-white/90">Tempo agora — capitais</h2>
          <p className="mt-1 text-xs text-white/40">Leitura atual por cidade (cache do pipeline).</p>
        </div>
        {loadingGrade ? (
          <div className="py-8 text-center text-sm text-white/45">Carregando capitais…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GRADE_CAPITAIS.map(({ slug, label }) => {
              const row = capitais[slug];
              const t = row?.temperatura_c != null ? Math.round(row.temperatura_c) : null;
              const u = row?.umidade_percentual != null ? Math.round(row.umidade_percentual) : null;
              const desc = labelTempo(row?.codigo_tempo);
              return (
                <div
                  key={slug}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-4"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-white/90">{label}</p>
                    <p className="mt-0.5 truncate text-sm text-white/45">{desc}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-semibold tabular-nums text-white/90">{t != null ? `${t}°` : "—"}</p>
                    <p className="mt-1 inline-flex items-center justify-end gap-1 text-xs text-white/45">
                      <Droplets className="h-3.5 w-3.5" />
                      {u != null ? `${u}%` : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {c ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#161621] p-5 ring-1 ring-white/5">
            <div className="mb-3 inline-flex rounded-lg bg-violet-500/15 p-2 text-violet-400">
              <Wind className="h-5 w-5" />
            </div>
            <p className="text-sm text-white/50">Vento</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">
              {vento != null ? `${Math.round(vento)} km/h` : "—"}
            </p>
            <p className="mt-2 text-xs text-white/40">Direção não informada pela API Open-Meteo.</p>
          </div>
          <div className="rounded-2xl bg-[#161621] p-5 ring-1 ring-white/5">
            <div className="mb-3 inline-flex rounded-lg bg-violet-500/15 p-2 text-violet-400">
              <Droplets className="h-5 w-5" />
            </div>
            <p className="text-sm text-white/50">Umidade</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">
              {umid != null ? `${Math.round(umid)}%` : "—"}
            </p>
            <p className="mt-2 text-xs text-white/40">
              Ponto de orvalho (aprox.): {orvalho != null ? `${orvalho}°C` : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-[#161621] p-5 ring-1 ring-white/5">
            <div className="mb-3 inline-flex rounded-lg bg-violet-500/15 p-2 text-violet-400">
              <Eye className="h-5 w-5" />
            </div>
            <p className="text-sm text-white/50">Visibilidade</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-white/90">—</p>
            <p className="mt-2 text-xs text-white/40">Dado não disponível nesta integração.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
