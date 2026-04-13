import Fastify from "fastify";
import { cacheFileExists, readJsonFile } from "./readCache.js";
import { cacheDir } from "./paths.js";
import { clientWantsHtml, renderIndexHtmlPage, renderJsonHtmlPage } from "./htmlView.js";

const app = Fastify({ logger: true });

type QueryFormat = { format?: string };

function slugArquivoCidade(cidade: string): string {
  return cidade
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

app.get<{ Querystring: QueryFormat }>("/", async (request, reply) => {
  if (!clientWantsHtml(request.headers.accept, request.query.format)) {
    return {
      nome: "Dados públicos BR",
      rotas: {
        health: "/health",
        populacao: "/populacao/estados",
        inflacao: "/inflacao",
        clima: "/clima/:cidade",
      },
      dica: "No navegador, rotas de dados usam página escura legível; ?format=json força JSON puro.",
    };
  }
  return reply.type("text/html").send(renderIndexHtmlPage());
});

app.get<{ Querystring: QueryFormat }>("/health", async (request, reply) => {
  const payload = { ok: true };
  if (clientWantsHtml(request.headers.accept, request.query.format)) {
    return reply.type("text/html").send(renderJsonHtmlPage("Health", payload));
  }
  return payload;
});

app.get<{ Querystring: QueryFormat }>("/populacao/estados", async (request, reply) => {
  const file = "estados_populacao.json";
  if (!(await cacheFileExists(file))) {
    const err = {
      erro: "Cache ausente. Execute o pipeline Python (data-service/pipeline.py).",
      cache: cacheDir(),
    };
    if (clientWantsHtml(request.headers.accept, request.query.format)) {
      return reply.status(503).type("text/html").send(renderJsonHtmlPage("Erro — população", err));
    }
    return reply.status(503).send(err);
  }
  const body = await readJsonFile<{ meta: unknown; dados: unknown }>(file);
  const payload = { meta: body.meta, estados: body.dados };
  if (clientWantsHtml(request.headers.accept, request.query.format)) {
    return reply.type("text/html").send(renderJsonHtmlPage("População por UF", payload));
  }
  return payload;
});

app.get<{ Querystring: QueryFormat }>("/inflacao", async (request, reply) => {
  const file = "inflacao.json";
  if (!(await cacheFileExists(file))) {
    const err = {
      erro: "Cache ausente. Execute o pipeline Python (data-service/pipeline.py).",
      cache: cacheDir(),
    };
    if (clientWantsHtml(request.headers.accept, request.query.format)) {
      return reply.status(503).type("text/html").send(renderJsonHtmlPage("Erro — inflação", err));
    }
    return reply.status(503).send(err);
  }
  const body = await readJsonFile<{ meta: unknown; serie: unknown }>(file);
  const payload = { meta: body.meta, serie: body.serie };
  if (clientWantsHtml(request.headers.accept, request.query.format)) {
    return reply.type("text/html").send(renderJsonHtmlPage("Inflação (IPCA)", payload));
  }
  return payload;
});

app.get<{ Params: { cidade: string }; Querystring: QueryFormat }>(
  "/clima/:cidade",
  async (request, reply) => {
    const slug = slugArquivoCidade(request.params.cidade);
    const file = `clima_${slug}.json`;
    if (!(await cacheFileExists(file))) {
      const err = {
        erro:
          "Arquivo de clima não encontrado para esta cidade. Rode o pipeline ou amplie o mapeamento em data-service/fetchers/clima.py.",
        cidade: request.params.cidade,
        arquivo_esperado: file,
      };
      if (clientWantsHtml(request.headers.accept, request.query.format)) {
        return reply.status(404).type("text/html").send(renderJsonHtmlPage("Erro — clima", err));
      }
      return reply.status(404).send(err);
    }
    const body = await readJsonFile<{ meta: unknown; dados: unknown }>(file);
    const payload = { meta: body.meta, clima: body.dados };
    if (clientWantsHtml(request.headers.accept, request.query.format)) {
      return reply
        .type("text/html")
        .send(renderJsonHtmlPage(`Clima — ${request.params.cidade}`, payload));
    }
    return payload;
  },
);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

app.listen({ port, host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
