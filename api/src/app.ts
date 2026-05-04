import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { cacheDir } from "./paths.js";
import { cacheFileExists, listCacheJsonFiles, readJsonWithEtag } from "./readCache.js";
import { clientWantsHtml, renderIndexHtmlPage, renderJsonHtmlPage } from "./htmlView.js";
import { ifNoneMatch, setCacheHeaders } from "./etag.js";

type QueryFormat = {
  format?: string;
  limit?: string;
  offset?: string;
};

const ROTAS_DOC = [
  { metodo: "GET", rota: "/", descricao: "Índice e descoberta" },
  { metodo: "GET", rota: "/health", descricao: "Saúde" },
  { metodo: "GET", rota: "/catalogo", descricao: "Arquivos em cache e rotas" },
  { metodo: "GET", rota: "/populacao/estados", descricao: "População por UF (IBGE)" },
  { metodo: "GET", rota: "/populacao/municipios/:uf", descricao: "Municípios por UF (cache)" },
  { metodo: "GET", rota: "/inflacao", descricao: "IPCA mensal (BCB), paginação ?limit=&offset=" },
  { metodo: "GET", rota: "/economia/selic", descricao: "Selic diária recente (BCB SGS 11)" },
  { metodo: "GET", rota: "/economia/cambio", descricao: "USD/BRL (BCB SGS 1)" },
  { metodo: "GET", rota: "/clima/:cidade", descricao: "Clima atual (cache)" },
  { metodo: "GET", rota: "/clima/:cidade/previsao", descricao: "Previsão 7 dias (cache)" },
  { metodo: "GET", rota: "/dados/gov-catalogo-amostra", descricao: "Amostra CKAN dados.gov.br" },
];

function slugArquivoCidade(cidade: string): string {
  return cidade
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function parseLimitOffset(
  q: QueryFormat,
  defaults: { limit: number; max: number },
): { limit: number; offset: number } {
  const limitRaw = Number(q.limit ?? defaults.limit);
  const offsetRaw = Number(q.offset ?? 0);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(defaults.max, Math.max(1, Math.floor(limitRaw)))
    : defaults.limit;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.floor(offsetRaw)) : 0;
  return { limit, offset };
}

async function replyMissing(
  request: FastifyRequest<{ Querystring: QueryFormat }>,
  reply: FastifyReply,
  status: 404 | 503,
  title: string,
  body: object,
): Promise<void> {
  if (clientWantsHtml(request.headers.accept, request.query.format)) {
    reply.status(status).type("text/html").send(renderJsonHtmlPage(title, body));
    return;
  }
  reply.status(status).send(body);
}

async function replyFromCache(
  request: FastifyRequest<{ Querystring: QueryFormat }>,
  reply: FastifyReply,
  file: string,
  opts: {
    missingStatus: 404 | 503;
    missingBody: object;
    missingTitle: string;
    htmlTitle: string;
    map: (body: Record<string, unknown>) => unknown;
  },
): Promise<void> {
  if (!(await cacheFileExists(file))) {
    await replyMissing(request, reply, opts.missingStatus, opts.missingTitle, opts.missingBody);
    return;
  }
  const { body, etag } = await readJsonWithEtag<Record<string, unknown>>(file);
  setCacheHeaders(reply, etag);
  if (ifNoneMatch(request, etag)) {
    reply.code(304).send();
    return;
  }
  const payload = opts.map(body);
  if (clientWantsHtml(request.headers.accept, request.query.format)) {
    reply.type("text/html").send(renderJsonHtmlPage(opts.htmlTitle, payload));
    return;
  }
  reply.send(payload);
}

function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ];
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: corsOrigins() });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Dados públicos BR",
        description:
          "API sobre cache JSON gerado pelo pipeline Python (IBGE, BCB, Open-Meteo, amostra dados.gov.br).",
        version: "1.1.0",
      },
      servers: [{ url: "http://127.0.0.1:3000" }],
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  app.get<{ Querystring: QueryFormat }>(
    "/",
    { schema: { tags: ["sistema"], description: "Índice" } },
    async (request, reply) => {
      if (!clientWantsHtml(request.headers.accept, request.query.format)) {
        return {
          nome: "Dados públicos BR",
          documentacao: "/docs",
          rotas: Object.fromEntries(ROTAS_DOC.map((r) => [r.rota, r.descricao])),
          dica: "No navegador, rotas de dados usam HTML legível; ?format=json força JSON. Ver também GET /catalogo.",
        };
      }
      return reply.type("text/html").send(renderIndexHtmlPage());
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/catalogo",
    { schema: { tags: ["sistema"], description: "Lista arquivos JSON no cache e rotas documentadas" } },
    async (request, reply) => {
      const arquivos = await listCacheJsonFiles();
      const payload = {
        cache_dir: cacheDir(),
        arquivos_cache: arquivos,
        rotas: ROTAS_DOC,
      };
      if (clientWantsHtml(request.headers.accept, request.query.format)) {
        return reply.type("text/html").send(renderJsonHtmlPage("Catálogo", payload));
      }
      return payload;
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/health",
    { schema: { tags: ["sistema"], description: "Healthcheck" } },
    async (request, reply) => {
      const payload = { ok: true };
      if (clientWantsHtml(request.headers.accept, request.query.format)) {
        return reply.type("text/html").send(renderJsonHtmlPage("Health", payload));
      }
      return payload;
    },
  );

  const cache503 = {
    erro: "Cache ausente. Execute o pipeline Python (data-service/pipeline.py).",
    cache: cacheDir(),
  };

  app.get<{ Querystring: QueryFormat }>(
    "/populacao/estados",
    { schema: { tags: ["populacao"], description: "Estimativa de população por UF" } },
    async (request, reply) => {
      await replyFromCache(request, reply, "estados_populacao.json", {
        missingStatus: 503,
        missingBody: cache503,
        missingTitle: "Erro — população",
        htmlTitle: "População por UF",
        map: (b) => ({ meta: b["meta"], estados: b["dados"] }),
      });
    },
  );

  app.get<{ Params: { uf: string }; Querystring: QueryFormat }>(
    "/populacao/municipios/:uf",
    { schema: { tags: ["populacao"], description: "Municípios da UF (arquivo municipios_<uf>.json)" } },
    async (request, reply) => {
      const uf = request.params.uf.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(uf)) {
        return reply.status(400).send({ erro: "UF inválida; use duas letras, ex.: PE" });
      }
      const file = `municipios_${uf.toLowerCase()}.json`;
      await replyFromCache(request, reply, file, {
        missingStatus: 404,
        missingBody: {
          erro: `Arquivo ${file} não encontrado. Rode o pipeline com --municipios-uf ${uf} ou defina MUNICIPIOS_UF.`,
          cache: cacheDir(),
        },
        missingTitle: "Erro — municípios",
        htmlTitle: `Municípios — ${uf}`,
        map: (b) => {
          const { limit, offset } = parseLimitOffset(request.query, { limit: 50, max: 200 });
          const dados = Array.isArray(b["dados"]) ? b["dados"] : [];
          const slice = dados.slice(offset, offset + limit);
          return {
            meta: b["meta"],
            uf: b["uf"],
            paginacao: { limit, offset, total: dados.length },
            municipios: slice,
          };
        },
      });
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/inflacao",
    { schema: { tags: ["economia"], description: "IPCA mensal; use limit/offset na série" } },
    async (request, reply) => {
      await replyFromCache(request, reply, "inflacao.json", {
        missingStatus: 503,
        missingBody: cache503,
        missingTitle: "Erro — inflação",
        htmlTitle: "Inflação (IPCA)",
        map: (b) => {
          const { limit, offset } = parseLimitOffset(request.query, { limit: 100, max: 500 });
          const serie = Array.isArray(b["serie"]) ? b["serie"] : [];
          return {
            meta: b["meta"],
            paginacao: { limit, offset, total: serie.length },
            serie: serie.slice(offset, offset + limit),
          };
        },
      });
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/economia/selic",
    { schema: { tags: ["economia"], description: "Série Selic (SGS 11)" } },
    async (request, reply) => {
      await replyFromCache(request, reply, "selic.json", {
        missingStatus: 503,
        missingBody: cache503,
        missingTitle: "Erro — Selic",
        htmlTitle: "Selic",
        map: (b) => ({ meta: b["meta"], serie: b["serie"] }),
      });
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/economia/cambio",
    { schema: { tags: ["economia"], description: "Série câmbio USD (SGS 1)" } },
    async (request, reply) => {
      await replyFromCache(request, reply, "cambio_usd.json", {
        missingStatus: 503,
        missingBody: cache503,
        missingTitle: "Erro — câmbio",
        htmlTitle: "Câmbio USD/BRL",
        map: (b) => ({ meta: b["meta"], serie: b["serie"] }),
      });
    },
  );

  app.get<{ Params: { cidade: string }; Querystring: QueryFormat }>(
    "/clima/:cidade",
    { schema: { tags: ["clima"], description: "Clima atual (arquivo clima_<slug>.json)" } },
    async (request, reply) => {
      const slug = slugArquivoCidade(request.params.cidade);
      const file = `clima_${slug}.json`;
      await replyFromCache(request, reply, file, {
        missingStatus: 404,
        missingBody: {
          erro: "Arquivo de clima não encontrado para esta cidade.",
          cidade: request.params.cidade,
          arquivo_esperado: file,
        },
        missingTitle: "Erro — clima",
        htmlTitle: `Clima — ${request.params.cidade}`,
        map: (b) => ({ meta: b["meta"], clima: b["dados"] }),
      });
    },
  );

  app.get<{ Params: { cidade: string }; Querystring: QueryFormat }>(
    "/clima/:cidade/previsao",
    { schema: { tags: ["clima"], description: "Previsão 7 dias (arquivo previsao_clima_<slug>.json)" } },
    async (request, reply) => {
      const slug = slugArquivoCidade(request.params.cidade);
      const file = `previsao_clima_${slug}.json`;
      await replyFromCache(request, reply, file, {
        missingStatus: 404,
        missingBody: {
          erro: "Arquivo de previsão não encontrado para esta cidade.",
          cidade: request.params.cidade,
          arquivo_esperado: file,
        },
        missingTitle: "Erro — previsão",
        htmlTitle: `Previsão — ${request.params.cidade}`,
        map: (b) => ({ meta: b["meta"], previsao: b["dados"] }),
      });
    },
  );

  app.get<{ Querystring: QueryFormat }>(
    "/dados/gov-catalogo-amostra",
    { schema: { tags: ["dados"], description: "Amostra do catálogo CKAN (dados.gov.br)" } },
    async (request, reply) => {
      await replyFromCache(request, reply, "gov_catalogo_amostra.json", {
        missingStatus: 503,
        missingBody: cache503,
        missingTitle: "Erro — gov.br",
        htmlTitle: "Gov.br — amostra CKAN",
        map: (b) => ({ meta: b["meta"], dados: b["dados"] }),
      });
    },
  );

  return app;
}
