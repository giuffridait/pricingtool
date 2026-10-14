import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { neon } from "@neondatabase/serverless";

const BUNDLED_DIR = path.join(process.cwd(), "data");

// Real persistence: if a Postgres database is connected (Vercel's Postgres
// storage is Neon-backed; DATABASE_URL/POSTGRES_URL is however either
// convention names it), every collection is a row (name, data jsonb) in one
// table. Falls back to the filesystem when no database is configured, so
// local dev needs nothing extra.
const CONNECTION_STRING = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = CONNECTION_STRING ? neon(CONNECTION_STRING) : undefined;

let tableReady: Promise<void> | undefined;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql!
      .query(`CREATE TABLE IF NOT EXISTS collections (name TEXT PRIMARY KEY, data JSONB NOT NULL)`)
      .then(() => undefined);
  }
  return tableReady;
}

async function readBundled<T>(collection: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(BUNDLED_DIR, `${collection}.json`), "utf-8");
    return JSON.parse(raw) as T[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// --- Postgres backend ---

async function pgRead<T>(collection: string): Promise<T[]> {
  await ensureTable();
  const rows = (await sql!.query(`SELECT data FROM collections WHERE name = $1`, [collection])) as { data: T[] }[];
  return rows.length > 0 ? rows[0].data : readBundled<T>(collection);
}

async function pgWrite<T>(collection: string, data: T[]): Promise<void> {
  await ensureTable();
  await sql!.query(
    `INSERT INTO collections (name, data) VALUES ($1, $2::jsonb)
     ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data`,
    [collection, JSON.stringify(data)],
  );
}

// Seeds the row from the bundled JSON the first time this collection is
// touched, then atomically replaces (by id) or appends the item in a single
// statement - no read-modify-write round trip, so concurrent upserts can't
// race each other.
async function pgUpsert<T extends { id: string }>(collection: string, item: T): Promise<T> {
  await ensureTable();
  const seed = await readBundled<T>(collection);
  await sql!.query(`INSERT INTO collections (name, data) VALUES ($1, $2::jsonb) ON CONFLICT (name) DO NOTHING`, [
    collection,
    JSON.stringify(seed),
  ]);
  await sql!.query(
    `UPDATE collections SET data = (
       CASE
         WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(data) elem WHERE elem->>'id' = $3)
         THEN (SELECT jsonb_agg(CASE WHEN elem->>'id' = $3 THEN $2::jsonb ELSE elem END) FROM jsonb_array_elements(data) elem)
         ELSE data || jsonb_build_array($2::jsonb)
       END
     )
     WHERE name = $1`,
    [collection, JSON.stringify(item), item.id],
  );
  return item;
}

async function pgRemove(collection: string, id: string): Promise<void> {
  await ensureTable();
  await sql!.query(
    `UPDATE collections
     SET data = COALESCE((SELECT jsonb_agg(elem) FROM jsonb_array_elements(data) elem WHERE elem->>'id' != $2), '[]'::jsonb)
     WHERE name = $1`,
    [collection, id],
  );
}

// --- Filesystem backend (local dev, or a Vercel deploy with no database
// connected yet - /tmp is writable there, unlike the read-only project dir,
// but ephemeral: wiped on cold start, not shared across instances) ---

const FS_WRITABLE_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "pricingtool-data") : BUNDLED_DIR;

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

async function fsCurrentList<T>(collection: string): Promise<T[]> {
  if (FS_WRITABLE_DIR !== BUNDLED_DIR) {
    const written = await readJson<T>(FS_WRITABLE_DIR, collection);
    if (written !== undefined) return written;
  }
  return (await readJson<T>(BUNDLED_DIR, collection)) ?? [];
}

async function fsWriteJson<T>(collection: string, data: T[]): Promise<void> {
  await fs.mkdir(FS_WRITABLE_DIR, { recursive: true });
  await fs.writeFile(path.join(FS_WRITABLE_DIR, `${collection}.json`), JSON.stringify(data, null, 2), "utf-8");
}

// --- Public API ---

export async function readCollection<T>(collection: string): Promise<T[]> {
  return sql ? pgRead<T>(collection) : fsCurrentList<T>(collection);
}

export async function writeCollection<T>(collection: string, data: T[]): Promise<void> {
  if (sql) return pgWrite(collection, data);
  await queued(collection, () => fsWriteJson(collection, data));
}

export async function upsert<T extends { id: string }>(collection: string, item: T): Promise<T> {
  if (sql) return pgUpsert(collection, item);
  return queued(collection, async () => {
    const list = await fsCurrentList<T>(collection);
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    await fsWriteJson(collection, list);
    return item;
  });
}

export async function remove(collection: string, id: string): Promise<void> {
  if (sql) return pgRemove(collection, id);
  await queued(collection, async () => {
    const list = await fsCurrentList<{ id: string }>(collection);
    await fsWriteJson(
      collection,
      list.filter((x) => x.id !== id),
    );
  });
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
