import type { Medication, MedicationView, Settings, Status } from './types.js';

const DAY_MS = 86_400_000;

function toDayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffDays(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(toDayNumber(iso) + days);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Días de cobertura en la fecha del registro (columna G de la planilla). */
export function baseCoverage(m: Medication): number | null {
  if (m.coverageDays != null) return m.coverageDays;
  if (m.pillsAvailable != null && m.dailyDose) return m.pillsAvailable / m.dailyDose;
  return null;
}

export function computeView(m: Medication, s: Settings, today = todayISO()): MedicationView {
  const dose = m.dailyDose && m.dailyDose > 0 ? m.dailyDose : null;
  const daysElapsed = Math.max(0, diffDays(m.recordDate, today));
  const base = baseCoverage(m);
  const remainingDays = base == null ? null : round2(Math.max(0, base - daysElapsed));

  let estimatedPillsLeft: number | null = null;
  let pillsAreEstimated = false;
  if (m.pillsAvailable != null) {
    estimatedPillsLeft = dose ? Math.max(0, m.pillsAvailable - dose * daysElapsed) : m.pillsAvailable;
  } else if (remainingDays != null && dose) {
    estimatedPillsLeft = remainingDays * dose;
    pillsAreEstimated = true;
  }
  if (estimatedPillsLeft != null) estimatedPillsLeft = round2(estimatedPillsLeft);

  const depletionDate = base != null && dose ? addDays(m.recordDate, Math.floor(base)) : null;
  const buyBefore = depletionDate ? addDays(depletionDate, -s.leadDays) : null;

  let status: Status;
  if (!dose) status = m.pillsAvailable === 0 ? 'SIN_STOCK' : 'A_DEMANDA';
  else if (remainingDays == null) status = 'FALTA_DATO';
  else if (remainingDays <= 0) status = 'SIN_STOCK';
  else if (remainingDays <= s.urgentDays) status = 'URGENTE';
  else if (remainingDays <= s.soonDays) status = 'COMPRAR_PRONTO';
  else status = 'OK';

  const warnings: string[] = [];
  if (dose && m.pillsAvailable != null && m.coverageDays != null) {
    const fromPills = m.pillsAvailable / dose;
    if (Math.abs(fromPills - m.coverageDays) > 2) {
      warnings.push(
        `${m.pillsAvailable} comprimidos a ${dose}/día alcanzan ~${Math.floor(fromPills)} días, no ${m.coverageDays}. Confirmá el conteo.`,
      );
    }
  }
  if (dose && m.pillsAvailable == null && m.coverageDays != null && m.pillsPerBox) {
    const boxDays = m.pillsPerBox / dose;
    if (m.coverageDays > boxDays + 2 && m.coverageDays <= boxDays * 1.5) {
      warnings.push(
        `Una caja de ${m.pillsPerBox} a ${dose}/día dura ~${Math.floor(boxDays)} días; ${m.coverageDays} días necesitaría más de una caja. Confirmá la cantidad real.`,
      );
    }
  }
  if (!dose) warnings.push('Uso a demanda: no se puede estimar la reposición sin una pauta habitual.');
  else if (remainingDays == null) warnings.push('Falta cargar cuántos comprimidos o días quedan.');

  return {
    ...m,
    daysElapsed,
    remainingDays,
    estimatedPillsLeft,
    pillsAreEstimated,
    depletionDate,
    buyBefore,
    status,
    warnings,
  };
}

export const STATUS_ORDER: Status[] = ['SIN_STOCK', 'URGENTE', 'COMPRAR_PRONTO', 'FALTA_DATO', 'OK', 'A_DEMANDA'];
