import type { Database } from '../shared/types.js';
import { defaultAuth, defaultNotifications, seedDatabase } from './seed.js';
import { createStore } from './store.js';

const { store, kind: storeKind } = createStore();
export { storeKind };

let cache: Database | null = null;
let writeQueue: Promise<void> = Promise.resolve();

/** Completa campos faltantes de bases creadas con versiones anteriores. Devuelve true si cambió algo. */
function normalize(db: Database): boolean {
  let changed = false;
  // Completa campos faltantes y descarta los de canales que ya no existen (WhatsApp).
  const defaults = defaultNotifications();
  const saved = (db.notifications ?? {}) as unknown as Partial<Record<string, unknown>>;
  const merged = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, saved[k] ?? v]));
  if (JSON.stringify(merged) !== JSON.stringify(db.notifications)) changed = true;
  db.notifications = merged as unknown as Database['notifications'];
  if (!db.sessions) {
    db.sessions = [];
    changed = true;
  }
  if (!db.auth) {
    // Bases creadas antes de existir el inicio de sesión.
    db.auth = defaultAuth();
    console.log(`Usuario inicial creado: ${db.auth.username}`);
    changed = true;
  }
  return changed;
}

async function readFresh(): Promise<Database> {
  let raw = await store.load();
  if (!raw) {
    await store.init(seedDatabase());
    raw = await store.load();
    if (!raw) throw new Error('No se pudo crear la base de datos inicial');
  }
  if (normalize(raw)) await store.save(raw);
  return raw;
}

export async function getDb(): Promise<Database> {
  // En serverless cada pedido puede caer en otra instancia: se lee siempre de la base.
  if (!store.cacheable) return readFresh();
  cache ??= await readFresh();
  return cache;
}

/** Aplica una mutación y la guarda; las escrituras se serializan. */
export async function mutate<T>(fn: (db: Database) => T): Promise<T> {
  const db = await getDb();
  const result = fn(db);
  writeQueue = writeQueue.then(() => store.save(db));
  await writeQueue;
  return result;
}
