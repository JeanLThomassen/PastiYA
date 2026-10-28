import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { setTimeZone } from '../shared/calc.js';
import { authApi, requireAuth } from './auth.js';
import { runDailyCheck } from './notify.js';
import { api, errorHandler } from './routes.js';

// Zona horaria para "hoy" y la hora del aviso (en Vercel el servidor corre en UTC).
const tz = process.env.APP_TZ;
if (tz) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    setTimeZone(tz);
  } catch {
    console.warn(`APP_TZ inválida (${tz}); se usa la zona del servidor.`);
  }
}

export const app = express();

// Detrás del proxy HTTPS del hosting, para que req.secure y req.ip sean correctos.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json());

/** Lo llama el Cron de Vercel una vez por día; Vercel envía `Authorization: Bearer $CRON_SECRET`. */
app.get('/api/cron/notify', async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET ?? '';
    const sent = Buffer.from(req.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (!secret || sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }
    await runDailyCheck();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authApi);
app.use('/api', requireAuth, api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

export default app;
