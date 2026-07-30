import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

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

async function filePath(collection: string) {
  return path.join(DATA_DIR, `${collection}.json`);
}

export async function readCollection<T>(collection: string): Promise<T[]> {
  const p = await filePath(collection);
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  await queued(collection, async () => {
    const p = await filePath(collection);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(p, JSON.stringify(data, null, 2), "utf-8");
  });
}

export async function upsert<T extends { id: string }>(collection: string, item: T): Promise<T> {
  return queued(collection, async () => {
    const p = await filePath(collection);
    await fs.mkdir(DATA_DIR, { recursive: true });
    let list: T[] = [];
    try {
      list = JSON.parse(await fs.readFile(p, "utf-8")) as T[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    await fs.writeFile(p, JSON.stringify(list, null, 2), "utf-8");
    return item;
  });
}

export async function remove(collection: string, id: string): Promise<void> {
  await queued(collection, async () => {
    const p = await filePath(collection);
    let list: { id: string }[] = [];
    try {
      list = JSON.parse(await fs.readFile(p, "utf-8"));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      return;
    }
    await fs.writeFile(
      p,
      JSON.stringify(
        list.filter((x) => x.id !== id),
        null,
        2,
      ),
      "utf-8",
    );
  });
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
