import type { Status } from '../../shared/types';

export const STATUS_LABEL: Record<Status, string> = {
  SIN_STOCK: 'Sin stock',
  URGENTE: 'Urgente',
  COMPRAR_PRONTO: 'Comprar pronto',
  OK: 'OK',
  FALTA_DATO: 'Falta dato',
  A_DEMANDA: 'A demanda',
};

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export function fmtNum(n: number | null | undefined): string {
  return n == null ? '—' : numFmt.format(n);
}

export function fmtDays(n: number | null): string {
  if (n == null) return '—';
  const d = Math.floor(n);
  return d === 1 ? '1 día' : `${d} días`;
}

/** Convierte el valor de un <input type="number"> en número o null. */
export function parseNum(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function numToInput(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}
