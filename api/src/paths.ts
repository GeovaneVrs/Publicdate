import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Diretório `data/cache` na raiz do repositório (irmão de `api/` e `data-service/`). */
export function cacheDir(): string {
  return path.resolve(__dirname, "../../data/cache");
}
