import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';
import { startScheduler } from './notify.js';

// En hosting se usa el PORT que asigna la plataforma. En desarrollo (npm run dev) se ignora,
// porque otras herramientas lo definen para Vite.
const isDev = process.env.npm_lifecycle_event?.startsWith('dev') ?? false;
const PORT = Number(process.env.API_PORT ?? (isDev ? undefined : process.env.PORT) ?? 3001);

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
