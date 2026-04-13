import fs from "node:fs/promises";
import path from "node:path";
import { cacheDir } from "./paths.js";

export async function readJsonFile<T>(name: string): Promise<T> {
  const full = path.join(cacheDir(), name);
  const raw = await fs.readFile(full, "utf-8");
  return JSON.parse(raw) as T;
}

export async function cacheFileExists(name: string): Promise<boolean> {
  try {
    await fs.access(path.join(cacheDir(), name));
    return true;
  } catch {
    return false;
  }
}
