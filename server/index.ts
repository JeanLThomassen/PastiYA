import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authApi, requireAuth } from './auth.js';
import { startScheduler } from './notify.js';
import { api, errorHandler } from './routes.js';

// En hosting se usa el PORT que asigna la plataforma. En desarrollo (npm run dev) se ignora,
// porque otras herramientas lo definen para Vite.
const isDev = process.env.npm_lifecycle_event?.startsWith('dev') ?? false;
const PORT = Number(process.env.API_PORT ?? (isDev ? undefined : process.env.PORT) ?? 3001);
const app = express();

// Detrás del proxy HTTPS del hosting, para que req.secure y req.ip sean correctos.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json());
app.use('/api/auth', authApi);
app.use('/api', requireAuth, api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

// En producción, el mismo servidor entrega el frontend compilado.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, '../../client');
if (existsSync(path.join(clientDir, 'index.html'))) {
  app.use(express.static(clientDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`PastiYA escuchando en el puerto ${PORT}`);
  startScheduler();
});
