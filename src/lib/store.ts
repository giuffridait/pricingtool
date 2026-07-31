import { promises as fs } from "fs";
import os from "os";
import path from "path";

const BUNDLED_DIR = path.join(process.cwd(), "data");
// Vercel's serverless filesystem is read-only outside /tmp, so writes have to
// go somewhere else there. /tmp is ephemeral (wiped on cold start, not shared
// across instances) - fine for a demo deploy, not real persistence. Locally
// (and on any host with a writable project dir) this is just DATA_DIR, so
// behavior is unchanged.
const WRITABLE_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "pricingtool-data") : BUNDLED_DIR;

// Simple file-backed JSON "collections". This is a prototype persistence layer:
// one JSON array per entity type, read/written whole. A per-file write queue
// keeps concurrent server actions from interleaving writes to the same file.

const writeQueues = new Map<string, Promise<unknown>>();

function queued<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prior = writeQueues.get(file) ?? Promise.resolve();
  const next = prior.then(fn, fn);
  writeQueues.set(
    file,
    next.catch(() => undefined),
  );
  return next;
}

async function readJson<T>(dir: string, collection: string): Promise<T[] | undefined> {
  try {
    const raw = await fs.readFile(path.join(dir, `${collection}.json`), "utf-8");
    return JSON.parse(raw) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

// Prefer whatever's already been written to WRITABLE_DIR (this instance's
// edits); fall back to the bundled seed data otherwise.
async function currentList<T>(collection: string): Promise<T[]> {
  if (WRITABLE_DIR !== BUNDLED_DIR) {
    const written = await readJson<T>(WRITABLE_DIR, collection);
    if (written !== undefined) return written;
  }
  return (await readJson<T>(BUNDLED_DIR, collection)) ?? [];
}

async function writeJson<T>(collection: string, data: T[]): Promise<void> {
  await fs.mkdir(WRITABLE_DIR, { recursive: true });
  await fs.writeFile(path.join(WRITABLE_DIR, `${collection}.json`), JSON.stringify(data, null, 2), "utf-8");
}

export async function readCollection<T>(collection: string): Promise<T[]> {
  return currentList<T>(collection);
}

export async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  await queued(collection, () => writeJson(collection, data));
}

export async function upsert<T extends { id: string }>(collection: string, item: T): Promise<T> {
  return queued(collection, async () => {
    const list = await currentList<T>(collection);
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    await writeJson(collection, list);
    return item;
  });
}

export async function remove(collection: string, id: string): Promise<void> {
  await queued(collection, async () => {
    const list = await currentList<{ id: string }>(collection);
    await writeJson(
      collection,
      list.filter((x) => x.id !== id),
    );
  });
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
