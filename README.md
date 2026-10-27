# PastiYA · Control de medicamentos

App web para controlar el stock y la reposición de medicamentos, basada en la planilla `KPI_control_medicamentos.xlsx`.

**Stack:** React + Vite (frontend), Express + Node (API), TypeScript en todo el proyecto.

## Uso

```bash
npm install
npm run dev        # API en :3001 y frontend en http://localhost:5173
```

Producción (un solo servidor sirve la API y el frontend compilado):

```bash
npm run build
npm start          # http://localhost:3001  (o el PORT que asigne el hosting)
```

Los datos se guardan en `data/db.json` (o en la carpeta de `DATA_DIR`). Si el archivo no existe, se crea con los medicamentos de la planilla (registro del 27/10/2026). Desde **Ajustes** se puede descargar un respaldo en JSON.

## Acceso

La app pide usuario y contraseña. El usuario inicial se crea junto con la base:

- Por defecto: `PastiYAADMIN` / `PastiYAADMIN`.
- En un hosting, definí `ADMIN_USER` y `ADMIN_PASSWORD` **antes del primer arranque** para no usar la clave por defecto.
- Después se cambian desde **Ajustes → Usuario y contraseña** (cambiar la clave cierra las demás sesiones).

La contraseña se guarda con hash (scrypt), la sesión es una cookie `httpOnly` de 30 días y tras 10 intentos fallidos
se bloquea el ingreso desde esa IP por 15 minutos.

## Publicar

Requisitos del hosting: **proceso siempre encendido** (para el aviso diario) y **disco persistente** (para `db.json`).
Los planes gratuitos que "duermen" la app o borran el disco en cada deploy no sirven.

| Opción | Cómo | Costo aprox. |
|---|---|---|
| **Railway** (recomendado) | Conectar el repo de GitHub, agregar un *Volume* montado en `/data` y las variables `DATA_DIR=/data`, `ADMIN_USER`, `ADMIN_PASSWORD`. Detecta el `Dockerfile`. | Plan Hobby, pago por uso |
| **Fly.io** | `fly launch` (usa el `Dockerfile`), `fly volumes create data`, montar en `/data`. | Pago por uso, bajo |
| **Render** | Web Service con el `Dockerfile` + *Persistent Disk* en `/data` (requiere plan pago; el gratuito no tiene disco). | Plan Starter + disco |
| **VPS** (Hetzner, DigitalOcean, Oracle Cloud Free) | `docker run -d -p 80:3001 -v pastiya:/data -e ADMIN_PASSWORD=… pastiya` detrás de un proxy con HTTPS (Caddy). | Desde gratis (Oracle) |
| **Tu PC + Cloudflare Tunnel** | `npm start` en la PC y `cloudflared tunnel` para exponerla con HTTPS. | Gratis (la PC debe estar prendida) |

Verificá precios y límites actuales en cada proveedor. Usá siempre HTTPS (todas las opciones de arriba lo dan).

## Lógica (igual que la planilla)

| Concepto | Cálculo |
|---|---|
| Días de cobertura | Cargados a mano, o comprimidos ÷ dosis diaria |
| Días restantes | Cobertura − días transcurridos desde el registro (se actualiza solo cada día) |
| Fecha de agotamiento | Fecha del registro + días de cobertura |
| Comprar antes de | Agotamiento − anticipación (7 días por defecto) |
| Estado | Sin stock (0) · Urgente (≤ 7) · Comprar pronto (≤ 14) · OK · Falta dato · A demanda |
| Compra | Total = cajas × comp./caja; cobertura tras compra = días que quedaban + total ÷ dosis |

Diferencias con la planilla:

- Al registrar una compra, el stock del medicamento se actualiza automáticamente (opcional).
- Los días restantes se descuentan día a día; en la planilla había que actualizarlos a mano.
- Advierte datos inconsistentes (p. ej. Plidan: una caja de 50 a 1,5/día no llega a 45 días).

## Notificaciones

- **Campanita** (barra superior): lista los medicamentos sin stock o por acabarse; tocando uno se abre "Registrar compra".
- **Avisos al teléfono** (Ajustes): una vez por día, a la hora elegida, el servidor manda una notificación push con
  [ntfy](https://ntfy.sh) listando los medicamentos con pocos días restantes. Hay que instalar la app ntfy en el teléfono
  y suscribirse al tema que muestra Ajustes; no requiere cuenta.
- Los avisos sólo se envían mientras el servidor esté corriendo. El mensaje incluye los nombres de los medicamentos y pasa
  por el servidor de ntfy.

## Estructura

```
shared/   tipos y cálculos compartidos (calc.ts)
server/   API Express: rutas, persistencia JSON y datos iniciales
client/   app React (Tablero, Compras, Ajustes)
```

## API

- `GET/POST /api/medications`, `PUT/DELETE /api/medications/:id`
- `POST /api/medications/:id/count` — registrar conteo `{ date, pills, days }`
- `GET/POST /api/purchases`, `DELETE /api/purchases/:id`
- `GET/PUT /api/settings` — `{ leadDays, urgentDays, soonDays }`
- `GET /api/alerts` — medicamentos por reponer (campanita)
- `GET/PUT /api/notifications`, `POST /api/notifications/test` — avisos al teléfono
- `GET /api/export` — respaldo completo

> Esta app organiza el inventario y las fechas estimadas; no reemplaza la receta ni la indicación médica.
