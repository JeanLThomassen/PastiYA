export type Status =
  | 'SIN_STOCK'
  | 'URGENTE'
  | 'COMPRAR_PRONTO'
  | 'OK'
  | 'FALTA_DATO'
  | 'A_DEMANDA';

/** Registro base de un medicamento (equivale a una fila de la hoja "Control"). */
export interface Medication {
  id: string;
  name: string;
  pillsPerBox: number | null;
  /** Comprimidos por día. null = uso a demanda / sin pauta fija. */
  dailyDose: number | null;
  /** Fecha del último conteo o actualización de stock (YYYY-MM-DD). */
  recordDate: string;
  /** Comprimidos contados en recordDate. null = no se contó. */
  pillsAvailable: number | null;
  /** Días de cobertura en recordDate; base para estimar agotamiento. */
  coverageDays: number | null;
  lastPurchaseDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Medicamento con los valores calculados al día de hoy. */
export interface MedicationView extends Medication {
  daysElapsed: number;
  remainingDays: number | null;
  estimatedPillsLeft: number | null;
  /** true cuando estimatedPillsLeft se deduce de los días y no de un conteo. */
  pillsAreEstimated: boolean;
  depletionDate: string | null;
  buyBefore: string | null;
  status: Status;
  warnings: string[];
}

export interface Purchase {
  id: string;
  date: string;
  medicationId: string;
  medicationName: string;
  boxes: number;
  pillsPerBox: number;
  totalPills: number;
  dailyDose: number | null;
  daysBefore: number | null;
  coverageAfter: number | null;
  appliedToStock: boolean;
  createdAt: string;
}

export interface Settings {
  /** Días de anticipación para "Comprar antes de". */
  leadDays: number;
  /** Hasta cuántos días restantes el estado es URGENTE. */
  urgentDays: number;
  /** Hasta cuántos días restantes el estado es COMPRAR PRONTO. */
  soonDays: number;
}

/** Aviso diario al teléfono (push vía ntfy) cuando un medicamento está por acabarse. */
export interface NotificationSettings {
  enabled: boolean;
  ntfyServer: string;
  ntfyTopic: string;
  /** Avisar cuando queden esta cantidad de días o menos. */
  notifyDays: number;
  /** Hora local (0-23) a partir de la cual se envía el aviso diario. */
  hour: number;
  /** Último día en que se envió el aviso automático (YYYY-MM-DD). */
  lastSentDate: string | null;
  lastError: string | null;
}

export interface Alert {
  medicationId: string;
  name: string;
  status: Status;
  remainingDays: number | null;
  buyBefore: string | null;
  message: string;
}

/** Credenciales del único usuario de la app (contraseña con scrypt + sal). */
export interface AuthConfig {
  username: string;
  passwordHash: string;
  salt: string;
}

export interface Session {
  /** SHA-256 del token de la cookie (el token en claro nunca se guarda). */
  tokenHash: string;
  expiresAt: string;
}

export interface Database {
  medications: Medication[];
  purchases: Purchase[];
  settings: Settings;
  notifications: NotificationSettings;
  auth: AuthConfig;
  sessions: Session[];
}

export interface MedicationInput {
  name: string;
  pillsPerBox: number | null;
  dailyDose: number | null;
  recordDate: string;
  pillsAvailable: number | null;
  coverageDays: number | null;
  notes: string;
}

export interface CountInput {
  date: string;
  pills: number | null;
  days: number | null;
}

export interface PurchaseInput {
  date: string;
  medicationId: string;
  boxes: number;
  pillsPerBox: number;
  dailyDose: number | null;
  daysBefore: number | null;
  applyToStock: boolean;
}
