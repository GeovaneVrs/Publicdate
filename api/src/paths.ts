import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Diretório do cache: `DATA_CACHE_DIR` ou `../../data/cache` relativo a `api/src`. */
export function cacheDir(): string {
  const override = process.env.DATA_CACHE_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(__dirname, "../../data/cache");
}
