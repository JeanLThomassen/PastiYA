import { neon } from '@neondatabase/serverless';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Database } from '../shared/types.js';

/** Dónde se guarda la base completa (un solo documento JSON). */
export interface Store {
  /** true si el proceso es de larga vida y puede mantener la base en memoria. */
  cacheable: boolean;
  load(): Promise<Database | null>;
  save(db: Database): Promise<void>;
  /** Guarda la base inicial sólo si todavía no existe (seguro ante pedidos simultáneos). */
  init(db: Database): Promise<void>;
}

function fileStore(): Store {
  const dir = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
  const file = path.join(dir, 'db.json');
  const save = async (db: Database) => {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await fs.rename(tmp, file);
  };
  return {
    cacheable: true,
    async load() {
      try {
        return JSON.parse(await fs.readFile(file, 'utf8')) as Database;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw err;
      }
    },
    save,
    async init(db) {
      await save(db);
      console.log(`Base de datos creada con datos iniciales en ${file}`);
    },
  };
}

/** Postgres (Neon) para hostings serverless como Vercel, donde no hay disco persistente. */
function postgresStore(url: string): Store {
  const sql = neon(url);
  let ready: Promise<unknown> | null = null;
  const ensureTable = () => {
    ready ??= sql`CREATE TABLE IF NOT EXISTS kv (key text PRIMARY KEY, value jsonb NOT NULL)`.catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  };
  return {
    cacheable: false,
    async load() {
      await ensureTable();
      const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
      return (rows[0]?.value as Database | undefined) ?? null;
    },
    async save(db) {
      await ensureTable();
      await sql`INSERT INTO kv (key, value) VALUES ('db', ${JSON.stringify(db)}::jsonb)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    },
    async init(db) {
      await ensureTable();
      await sql`INSERT INTO kv (key, value) VALUES ('db', ${JSON.stringify(db)}::jsonb) ON CONFLICT (key) DO NOTHING`;
      console.log('Base de datos creada con datos iniciales en Postgres');
    },
  };
}

/** DATABASE_URL / POSTGRES_URL; si al conectar la base se eligió otro prefijo (p. ej. STORAGE_URL), cualquier variable con una URL de Postgres. */
function findPostgresUrl(): string | undefined {
  const direct = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (direct) return direct;
  return Object.values(process.env).find((v) => v && /^postgres(ql)?:\/\//.test(v));
}

/** En Vercel no hay disco persistente: sin base de datos conectada, todo pedido falla con un mensaje claro. */
function missingStore(): Store {
  const fail = (): never => {
    throw Object.assign(
      new Error('Falta la base de datos: conectá Neon al proyecto de Vercel (variable DATABASE_URL).'),
      { code: 'NO_DATABASE' },
    );
  };
  return { cacheable: false, load: fail, save: fail, init: fail };
}

export type StoreKind = 'postgres' | 'file' | 'none';

export function createStore(): { store: Store; kind: StoreKind } {
  const url = findPostgresUrl();
  if (url) return { store: postgresStore(url), kind: 'postgres' };
  if (process.env.VERCEL) return { store: missingStore(), kind: 'none' };
  return { store: fileStore(), kind: 'file' };
}
