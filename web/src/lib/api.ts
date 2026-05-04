/** Base da API: em dev usa proxy `/api`; em produção use `VITE_API_URL`. */

function apiOrigin(): string {
  if (import.meta.env.DEV) {
    return "/api";
  }
  return (import.meta.env.VITE_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function docsUrl(): string {
  if (import.meta.env.DEV) {
    return "http://127.0.0.1:3000/docs";
  }
  return `${apiOrigin()}/docs`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const origin = apiOrigin();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}${sep}format=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text) as { erro?: string };
      if (j.erro) msg = j.erro;
    } catch {
      /* ignore */
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return JSON.parse(text) as T;
}
