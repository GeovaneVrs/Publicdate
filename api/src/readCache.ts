import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { cacheDir } from "./paths.js";

export async function readJsonFile<T>(name: string): Promise<T> {
  const full = path.join(cacheDir(), name);
  const raw = await fs.readFile(full, "utf-8");
  return JSON.parse(raw) as T;
}

export async function readJsonWithEtag<T>(name: string): Promise<{ body: T; etag: string }> {
  const full = path.join(cacheDir(), name);
  const buf = await fs.readFile(full);
  const etag = `"${crypto.createHash("sha1").update(buf).digest("hex")}"`;
  return { body: JSON.parse(buf.toString("utf-8")) as T, etag };
}

export async function cacheFileExists(name: string): Promise<boolean> {
  try {
    await fs.access(path.join(cacheDir(), name));
    return true;
  } catch {
    return false;
  }
}

export async function listCacheJsonFiles(): Promise<string[]> {
  try {
    const dir = cacheDir();
    const names = await fs.readdir(dir);
    return names.filter((n) => n.endsWith(".json")).sort();
  } catch {
    return [];
  }
}
