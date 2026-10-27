import { createHash, randomBytes } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { getDb, mutate } from './db.js';
import { hashPassword, verifyPassword } from './password.js';

const COOKIE = 'pastiya_session';
const SESSION_DAYS = 30;
const MAX_FAILS = 10;
const LOCK_MS = 15 * 60_000;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSessionCookie(req: Request, res: Response, token: string | null) {
  res.cookie(COOKIE, token ?? '', {
    httpOnly: true,
    sameSite: 'lax',
    // En hosting con HTTPS la cookie sólo viaja cifrada; en localhost (http) también funciona.
    secure: req.secure,
    path: '/',
    maxAge: token ? SESSION_DAYS * 86_400_000 : 0,
  });
}

async function currentSession(req: Request) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const db = await getDb();
  const hash = sha256(token);
  const now = new Date().toISOString();
  const s = db.sessions.find((x) => x.tokenHash === hash && x.expiresAt > now);
  return s ? { hash, username: db.auth.username } : null;
}

/** Protege el resto de la API: sin sesión válida responde 401. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    if (await currentSession(req)) return next();
    res.status(401).json({ error: 'Iniciá sesión para continuar' });
  } catch (err) {
    next(err);
  }
}

// Bloqueo simple por IP ante intentos fallidos repetidos.
const fails = new Map<string, { count: number; until: number }>();

const loginSchema = z.object({ username: z.string().trim().min(1).max(60), password: z.string().min(1).max(200) });
const credentialsSchema = z.object({
  username: z.string().trim().min(3, 'El usuario debe tener al menos 3 caracteres').max(60),
  currentPassword: z.string().min(1, 'Ingresá la contraseña actual'),
  newPassword: z.string().max(200).optional(),
});

export const authApi = Router();

authApi.post('/login', async (req, res, next) => {
  try {
    const ip = req.ip ?? 'unknown';
    const f = fails.get(ip);
    if (f && f.count >= MAX_FAILS && f.until > Date.now()) {
      res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
      return;
    }
    const parsed = loginSchema.safeParse(req.body);
    const db = await getDb();
    const ok = parsed.success && parsed.data.username === db.auth.username && verifyPassword(db.auth, parsed.data.password);
    if (!ok) {
      const count = (f && f.until > Date.now() ? f.count : 0) + 1;
      fails.set(ip, { count, until: Date.now() + LOCK_MS });
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      return;
    }
    fails.delete(ip);
    const token = randomBytes(32).toString('hex');
    await mutate((d) => {
      const now = new Date().toISOString();
      d.sessions = d.sessions.filter((s) => s.expiresAt > now);
      d.sessions.push({ tokenHash: sha256(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString() });
    });
    setSessionCookie(req, res, token);
    res.json({ username: db.auth.username });
  } catch (err) {
    next(err);
  }
});

authApi.post('/logout', async (req, res, next) => {
  try {
    const s = await currentSession(req);
    if (s) await mutate((d) => void (d.sessions = d.sessions.filter((x) => x.tokenHash !== s.hash)));
    setSessionCookie(req, res, null);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authApi.get('/me', async (req, res, next) => {
  try {
    const s = await currentSession(req);
    if (!s) {
      res.status(401).json({ error: 'Sin sesión' });
      return;
    }
    res.json({ username: s.username });
  } catch (err) {
    next(err);
  }
});

/** Cambiar usuario y/o contraseña (pide la contraseña actual). Cierra las demás sesiones. */
authApi.put('/credentials', requireAuth, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const db = await getDb();
    if (!verifyPassword(db.auth, input.currentPassword)) {
      res.status(400).json({ error: 'La contraseña actual no es correcta' });
      return;
    }
    if (input.newPassword && input.newPassword.length < 8) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
      return;
    }
    const s = await currentSession(req);
    await mutate((d) => {
      d.auth.username = input.username;
      if (input.newPassword) Object.assign(d.auth, hashPassword(input.newPassword));
      d.sessions = d.sessions.filter((x) => x.tokenHash === s?.hash);
    });
    res.json({ username: input.username });
  } catch (err) {
    next(err);
  }
});
