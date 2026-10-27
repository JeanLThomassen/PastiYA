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

export function createStore(): Store {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url ? postgresStore(url) : fileStore();
}
