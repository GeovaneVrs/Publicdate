import type { FastifyRequest } from "fastify";

export function ifNoneMatch(request: FastifyRequest, etag: string): boolean {
  const inm = request.headers["if-none-match"];
  if (!inm || typeof inm !== "string") return false;
  const candidates = inm.split(",").map((s) => s.trim());
  return candidates.includes(etag) || candidates.includes(`W/${etag}`);
}

export function setCacheHeaders(reply: { header: (k: string, v: string) => unknown }, etag: string): void {
  reply.header("Cache-Control", "public, max-age=60");
  reply.header("ETag", etag);
}
