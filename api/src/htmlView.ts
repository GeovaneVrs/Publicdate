/** Página HTML simples para visualizar JSON no navegador (contraste legível). */

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function formatQueryValue(format: unknown): string | undefined {
  if (format === undefined || format === null) return undefined;
  if (typeof format === "string") return format;
  if (Array.isArray(format) && typeof format[0] === "string") return format[0];
  return undefined;
}

/** Navegador típico envia text/html primeiro; `?format=json` força JSON. */
export function clientWantsHtml(
  accept: string | undefined,
  format: unknown,
): boolean {
  const f = formatQueryValue(format);
  if (f === "json") return false;
  if (f === "html") return true;
  if (!accept) return false;
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("text/html");
}

export function renderJsonHtmlPage(title: string, payload: unknown): string {
  const raw = JSON.stringify(payload, null, 2);
  const body = escapeHtml(raw);
  const t = escapeAttr(title);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0;
    font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", Menlo, Consolas, monospace;
    background: #0d1117;
    color: #e6edf3;
    min-height: 100vh;
  }
  header {
    padding: 0.75rem 1rem;
    background: #161b22;
    border-bottom: 1px solid #30363d;
  }
  h1 { font-size: 1rem; font-weight: 600; margin: 0; color: #f0f6fc; }
  .links { font-size: 12px; margin-top: 0.4rem; }
  .links a { color: #58a6ff; margin-right: 0.75rem; }
  pre {
    margin: 0;
    padding: 1rem;
    font-size: 13px;
    line-height: 1.55;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: #c9d1d9;
  }
</style>
</head>
<body>
<header>
  <h1>${t}</h1>
  <div class="links">
    <a href="?format=json">Ver como JSON (bruto)</a>
    <a href="/">Início da API</a>
  </div>
</header>
<pre>${body}</pre>
</body>
</html>`;
}

export function renderIndexHtmlPage(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dados públicos BR</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    background: #0d1117;
    color: #e6edf3;
    min-height: 100vh;
    padding: 1.25rem 1.5rem;
  }
  h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #f0f6fc; }
  p { color: #8b949e; font-size: 14px; margin: 0 0 1rem; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { margin: 0.5rem 0; }
  a { color: #58a6ff; text-decoration: none; font-size: 14px; }
  a:hover { text-decoration: underline; }
  code { background: #161b22; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 13px; }
</style>
</head>
<body>
  <h1>Dados públicos BR</h1>
  <p>Abra as rotas abaixo no navegador — a resposta vem em página escura legível. Para JSON puro, use <code>?format=json</code>.</p>
  <ul>
    <li><a href="/health">/health</a></li>
    <li><a href="/populacao/estados">/populacao/estados</a></li>
    <li><a href="/inflacao">/inflacao</a></li>
    <li><a href="/clima/recife">/clima/recife</a></li>
  </ul>
</body>
</html>`;
}
