import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Database } from '../shared/types.js';
import { defaultAuth, defaultNotifications, seedDatabase } from './seed.js';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let cache: Database | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(raw) as Database;
    // Completa campos faltantes y descarta los de canales que ya no existen (WhatsApp).
    const defaults = defaultNotifications();
    const saved = (db.notifications ?? {}) as unknown as Partial<Record<string, unknown>>;
    db.notifications = Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, saved[k] ?? v]),
    ) as unknown as Database['notifications'];
    db.sessions ??= [];
    if (!db.auth) {
      // Bases creadas antes de existir el inicio de sesión.
      db.auth = defaultAuth();
      await persist(db);
      console.log(`Usuario inicial creado: ${db.auth.username}`);
    }
    return db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    const db = seedDatabase();
    await persist(db);
    console.log(`Base de datos creada con datos iniciales en ${DB_FILE}`);
    return db;
  }
}

async function persist(db: Database): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tmp, DB_FILE);
}

export async function getDb(): Promise<Database> {
  cache ??= await load();
  return cache;
}

/** Aplica una mutación y la guarda en disco; las escrituras se serializan. */
export async function mutate<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDb();
  const result = fn(db);
  writeQueue = writeQueue.then(() => persist(db));
  await writeQueue;
  return result;
}
