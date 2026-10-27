import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { computeView, round2, todayISO } from '../shared/calc.js';
import type { Medication, Purchase } from '../shared/types.js';
import { getDb, mutate } from './db.js';
import { buildAlerts, sendTest } from './notify.js';

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)');
const optNum = z.number().nonnegative().nullable();

const medicationSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  pillsPerBox: z.number().int().positive().nullable(),
  dailyDose: z.number().positive().nullable(),
  recordDate: isoDate,
  pillsAvailable: optNum,
  coverageDays: optNum,
  notes: z.string().max(1000).default(''),
});

const countSchema = z
  .object({ date: isoDate, pills: optNum, days: optNum })
  .refine((c) => c.pills != null || c.days != null, 'Indicá comprimidos o días restantes');

const purchaseSchema = z.object({
  date: isoDate,
  medicationId: z.string().min(1),
  boxes: z.number().int().positive(),
  pillsPerBox: z.number().int().positive(),
  dailyDose: z.number().positive().nullable(),
  daysBefore: optNum,
  applyToStock: z.boolean(),
});

const settingsSchema = z.object({
  leadDays: z.number().int().min(0).max(90),
  urgentDays: z.number().int().min(0).max(90),
  soonDays: z.number().int().min(0).max(180),
});

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

function findMed(meds: Medication[], id: string | string[]): Medication {
  const med = meds.find((m) => m.id === String(id));
  if (!med) throw new HttpError(404, 'Medicamento no encontrado');
  return med;
}

export const api = Router();

api.get(
  '/medications',
  wrap(async (_req, res) => {
    const db = await getDb();
    res.json(db.medications.map((m) => computeView(m, db.settings)));
  }),
);

api.post(
  '/medications',
  wrap(async (req, res) => {
    const input = medicationSchema.parse(req.body);
    const now = new Date().toISOString();
    const med = await mutate((db) => {
      const m: Medication = { id: randomUUID(), ...input, lastPurchaseDate: null, createdAt: now, updatedAt: now };
      db.medications.push(m);
      return computeView(m, db.settings);
    });
    res.status(201).json(med);
  }),
);

api.put(
  '/medications/:id',
  wrap(async (req, res) => {
    const input = medicationSchema.parse(req.body);
    const med = await mutate((db) => {
      const m = findMed(db.medications, req.params.id);
      Object.assign(m, input, { updatedAt: new Date().toISOString() });
      return computeView(m, db.settings);
    });
    res.json(med);
  }),
);

api.delete(
  '/medications/:id',
  wrap(async (req, res) => {
    await mutate((db) => {
      findMed(db.medications, req.params.id);
      db.medications = db.medications.filter((m) => m.id !== req.params.id);
    });
    res.status(204).end();
  }),
);

/** Registrar un conteo: actualiza fecha del registro, comprimidos y días de cobertura. */
api.post(
  '/medications/:id/count',
  wrap(async (req, res) => {
    const { date, pills, days } = countSchema.parse(req.body);
    const med = await mutate((db) => {
      const m = findMed(db.medications, req.params.id);
      m.recordDate = date;
      m.pillsAvailable = pills;
      m.coverageDays = days ?? (pills != null && m.dailyDose ? round2(pills / m.dailyDose) : null);
      m.updatedAt = new Date().toISOString();
      return computeView(m, db.settings);
    });
    res.json(med);
  }),
);

api.get(
  '/purchases',
  wrap(async (_req, res) => {
    const db = await getDb();
    const sorted = [...db.purchases].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    res.json(sorted);
  }),
);

api.post(
  '/purchases',
  wrap(async (req, res) => {
    const input = purchaseSchema.parse(req.body);
    const purchase = await mutate((db) => {
      const m = findMed(db.medications, input.medicationId);
      const before = computeView(m, db.settings, input.date);
      const dose = input.dailyDose;
      const totalPills = input.boxes * input.pillsPerBox;
      const daysBefore = input.daysBefore ?? before.remainingDays;
      const coverageAfter = dose && daysBefore != null ? round2(daysBefore + totalPills / dose) : null;

      const p: Purchase = {
        id: randomUUID(),
        date: input.date,
        medicationId: m.id,
        medicationName: m.name,
        boxes: input.boxes,
        pillsPerBox: input.pillsPerBox,
        totalPills,
        dailyDose: dose,
        daysBefore,
        coverageAfter,
        appliedToStock: input.applyToStock,
        createdAt: new Date().toISOString(),
      };
      db.purchases.push(p);

      if (input.applyToStock) {
        const pillsBefore = dose && daysBefore != null ? daysBefore * dose : (before.estimatedPillsLeft ?? 0);
        m.recordDate = input.date;
        m.pillsAvailable = round2(pillsBefore + totalPills);
        m.coverageDays = dose ? round2(m.pillsAvailable / dose) : null;
        m.dailyDose = dose;
        m.pillsPerBox = input.pillsPerBox;
      }
      if (!m.lastPurchaseDate || input.date >= m.lastPurchaseDate) m.lastPurchaseDate = input.date;
      m.updatedAt = new Date().toISOString();
      return p;
    });
    res.status(201).json(purchase);
  }),
);

api.delete(
  '/purchases/:id',
  wrap(async (req, res) => {
    await mutate((db) => {
      if (!db.purchases.some((p) => p.id === req.params.id)) throw new HttpError(404, 'Compra no encontrada');
      db.purchases = db.purchases.filter((p) => p.id !== req.params.id);
    });
    res.status(204).end();
  }),
);

api.get(
  '/settings',
  wrap(async (_req, res) => {
    res.json((await getDb()).settings);
  }),
);

api.put(
  '/settings',
  wrap(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    if (input.urgentDays > input.soonDays) {
      throw new HttpError(400, '"Urgente" no puede superar a "Comprar pronto"');
    }
    const settings = await mutate((db) => (db.settings = input));
    res.json(settings);
  }),
);

const notificationsSchema = z.object({
  enabled: z.boolean(),
  ntfyServer: z.string().trim().url('Servidor de ntfy inválido').max(200),
  ntfyTopic: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,64}$/, 'El tema de ntfy sólo admite letras, números, "-" y "_"'),
  notifyDays: z.number().int().min(0).max(60),
  hour: z.number().int().min(0).max(23),
});

api.get(
  '/alerts',
  wrap(async (_req, res) => {
    res.json(buildAlerts(await getDb()));
  }),
);

api.get(
  '/notifications',
  wrap(async (_req, res) => {
    res.json((await getDb()).notifications);
  }),
);

api.put(
  '/notifications',
  wrap(async (req, res) => {
    const input = notificationsSchema.parse(req.body);
    const n = await mutate((db) => {
      const changedTarget =
        input.ntfyServer !== db.notifications.ntfyServer || input.ntfyTopic !== db.notifications.ntfyTopic;
      // Si cambia el destino, permitir un nuevo aviso hoy.
      db.notifications = { ...db.notifications, ...input, ...(changedTarget && { lastSentDate: null }) };
      return db.notifications;
    });
    res.json(n);
  }),
);

api.post(
  '/notifications/test',
  wrap(async (_req, res) => {
    try {
      const text = await sendTest();
      res.json({ ok: true, text });
    } catch (err) {
      throw new HttpError(502, (err as Error).message);
    }
  }),
);

api.get(
  '/export',
  wrap(async (_req, res) => {
    const db = await getDb();
    res.setHeader('Content-Disposition', `attachment; filename="pastiya-${todayISO()}.json"`);
    res.json(db);
  }),
);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: err.issues.map((i) => i.message).join('. ') });
  } else if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
