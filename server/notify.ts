import { computeView, currentHour, todayISO } from '../shared/calc.js';
import type { Alert, Database, NotificationSettings } from '../shared/types.js';
import { getDb, mutate } from './db.js';

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Medicamentos sin stock o con pocos días restantes, del más urgente al menos. */
export function buildAlerts(db: Database, today = todayISO()): Alert[] {
  const limit = Math.max(db.notifications.notifyDays, db.settings.soonDays);
  return db.medications
    .map((m) => computeView(m, db.settings, today))
    .filter((v) => v.status === 'SIN_STOCK' || (v.dailyDose && v.remainingDays != null && v.remainingDays <= limit))
    .sort((a, b) => (a.remainingDays ?? 0) - (b.remainingDays ?? 0))
    .map((v) => {
      const days = v.remainingDays == null ? 0 : Math.floor(v.remainingDays);
      let message: string;
      if (v.status === 'SIN_STOCK') message = 'Sin stock: comprar ya';
      else if (v.buyBefore && v.buyBefore < today) message = `Quedan ${days} día${days === 1 ? '' : 's'}: comprar ya`;
      else message = `Quedan ${days} día${days === 1 ? '' : 's'}: comprar antes del ${fmtDate(v.buyBefore!)}`;
      return {
        medicationId: v.id,
        name: v.name,
        status: v.status,
        remainingDays: v.remainingDays,
        buyBefore: v.buyBefore,
        message,
      };
    });
}

/** Alertas que justifican un aviso al teléfono (umbral propio de notificaciones). */
function phoneAlerts(db: Database, today: string): Alert[] {
  return buildAlerts(db, today).filter(
    (a) => a.status === 'SIN_STOCK' || (a.remainingDays != null && a.remainingDays <= db.notifications.notifyDays),
  );
}

function composeMessage(alerts: Alert[]): string {
  if (alerts.length === 0) return 'PastiYA: todos los medicamentos tienen stock suficiente.';
  const lines = alerts.map((a) => `• ${a.name}: ${a.message}`);
  return ['PastiYA – Medicamentos por reponer:', ...lines].join('\n');
}

/** Envía una notificación push al tema de ntfy configurado. */
export async function sendMessage(n: NotificationSettings, text: string): Promise<void> {
  if (!n.ntfyTopic.trim()) throw new Error('Falta el tema de ntfy.');
  const res = await fetch(n.ntfyServer.replace(/\/+$/, ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: n.ntfyTopic.trim(),
      title: 'PastiYA',
      message: text,
      priority: 4,
      tags: ['pill'],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`ntfy respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function sendTest(): Promise<string> {
  const db = await getDb();
  const text = composeMessage(phoneAlerts(db, todayISO()));
  await sendMessage(db.notifications, `[Prueba] ${text}`);
  return text;
}

/** Envía como máximo un aviso por día, a partir de la hora configurada. */
export async function runDailyCheck(): Promise<void> {
  const db = await getDb();
  const n = db.notifications;
  const today = todayISO();
  if (!n.enabled || n.lastSentDate === today || currentHour() < n.hour) return;

  const alerts = phoneAlerts(db, today);
  try {
    if (alerts.length > 0) await sendMessage(n, composeMessage(alerts));
    await mutate((d) => {
      d.notifications.lastSentDate = today;
      d.notifications.lastError = null;
    });
    if (alerts.length > 0) console.log(`Aviso enviado por ntfy con ${alerts.length} medicamento(s).`);
  } catch (err) {
    const msg = (err as Error).message;
    console.error('No se pudo enviar el aviso:', msg);
    await mutate((d) => {
      d.notifications.lastError = msg;
    });
  }
}

export function startScheduler(): void {
  const run = () => runDailyCheck().catch((err) => console.error(err));
  setTimeout(run, 5_000);
  setInterval(run, 15 * 60_000);
}
