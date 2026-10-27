import { randomBytes, randomUUID } from 'node:crypto';
import type { AuthConfig, Database, Medication, NotificationSettings } from '../shared/types.js';
import { hashPassword } from './password.js';

// Datos iniciales tomados de KPI_control_medicamentos.xlsx (hoja "Control", 27/10/2026).
const RECORD_DATE = '2026-10-27';

type SeedRow = [
  name: string,
  pillsPerBox: number,
  dailyDose: number | null,
  pillsAvailable: number | null,
  coverageDays: number | null,
  notes: string,
];

const rows: SeedRow[] = [
  ['Plidan', 50, 1.5, null, 45, 'Mamá indica ~1 mes y medio; revisar porque una caja de 50 no equivale a 45 días a 1,5/día.'],
  ['Atenolol', 50, 0.5, null, 60, 'Mamá indica ~2 meses.'],
  ['Aspirinte', 50, 1, null, 45, 'Mamá indica ~1 mes y medio.'],
  ['Humorap', 28, 1, 6, 6, 'Quedan 6 días según mamá.'],
  ['Medocor AP', 30, 1, 12, 12, 'Quedan 12 días según mamá.'],
  ['Neriex', 30, 1, 0, 0, 'Mamá indica que no tiene; verificar disponibilidad/indicación.'],
  ['Neumocort', 60, 2, 0, 0, 'Mamá indica que no tiene; verificar disponibilidad/indicación.'],
  ['Cetirizina', 20, 1, null, null, 'Falta indicar cuántos comprimidos o días le quedan.'],
  ['Lukast', 30, 1, 0, 0, 'Mamá indica que no tiene; verificar disponibilidad/indicación.'],
  ['Rosuvastatina', 30, 1, 0, 0, 'Mamá indica que no tiene; verificar disponibilidad/indicación.'],
  ['Regulane', 10, null, 0, null, 'Uso a demanda; no se calcula duración sin una pauta de consumo habitual.'],
];

export function defaultNotifications(): NotificationSettings {
  return {
    enabled: false,
    ntfyServer: 'https://ntfy.sh',
    // Tema aleatorio: en ntfy.sh cualquiera que conozca el nombre puede leerlo.
    ntfyTopic: `pastiya-${randomBytes(6).toString('hex')}`,
    notifyDays: 7,
    hour: 9,
    lastSentDate: null,
    lastError: null,
  };
}

/**
 * Usuario inicial. Se puede definir con ADMIN_USER / ADMIN_PASSWORD al crear la base;
 * después se cambia desde Ajustes.
 */
export function defaultAuth(): AuthConfig {
  return {
    username: process.env.ADMIN_USER || 'PastiYAADMIN',
    ...hashPassword(process.env.ADMIN_PASSWORD || 'PastiYAADMIN'),
  };
}

export function seedDatabase(): Database {
  const now = new Date().toISOString();
  const medications: Medication[] = rows.map(
    ([name, pillsPerBox, dailyDose, pillsAvailable, coverageDays, notes]) => ({
      id: randomUUID(),
      name,
      pillsPerBox,
      dailyDose,
      recordDate: RECORD_DATE,
      pillsAvailable,
      coverageDays,
      lastPurchaseDate: null,
      notes,
      createdAt: now,
      updatedAt: now,
    }),
  );
  return {
    medications,
    purchases: [],
    settings: { leadDays: 7, urgentDays: 7, soonDays: 14 },
    notifications: defaultNotifications(),
    auth: defaultAuth(),
    sessions: [],
  };
}
