import type {
  Alert,
  NotificationSettings,
  CountInput,
  MedicationInput,
  MedicationView,
  Purchase,
  PurchaseInput,
  Settings,
} from '../../shared/types';

export const STALE_EVENT = 'pastiya:stale';
/** La sesión venció o se cerró en otro lado: hay que volver a ingresar. */
export const UNAUTH_EVENT = 'pastiya:unauth';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event(UNAUTH_EVENT));
    }
    // Un 404 al modificar significa que la página tiene datos viejos (p. ej. la base se recreó).
    if (res.status === 404 && method !== 'GET') {
      window.dispatchEvent(new Event(STALE_EVENT));
      throw new Error('Los datos habían cambiado y se recargaron. Volvé a intentarlo.');
    }
    throw new Error(data?.error ?? `Error ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  medications: () => request<MedicationView[]>('GET', '/medications'),
  createMedication: (m: MedicationInput) => request<MedicationView>('POST', '/medications', m),
  updateMedication: (id: string, m: MedicationInput) => request<MedicationView>('PUT', `/medications/${id}`, m),
  deleteMedication: (id: string) => request<void>('DELETE', `/medications/${id}`),
  count: (id: string, c: CountInput) => request<MedicationView>('POST', `/medications/${id}/count`, c),
  purchases: () => request<Purchase[]>('GET', '/purchases'),
  createPurchase: (p: PurchaseInput) => request<Purchase>('POST', '/purchases', p),
  deletePurchase: (id: string) => request<void>('DELETE', `/purchases/${id}`),
  settings: () => request<Settings>('GET', '/settings'),
  saveSettings: (s: Settings) => request<Settings>('PUT', '/settings', s),
  alerts: () => request<Alert[]>('GET', '/alerts'),
  notifications: () => request<NotificationSettings>('GET', '/notifications'),
  saveNotifications: (n: NotificationInput) => request<NotificationSettings>('PUT', '/notifications', n),
  testNotification: () => request<{ ok: true; text: string }>('POST', '/notifications/test'),
  me: () => request<User>('GET', '/auth/me'),
  login: (username: string, password: string) => request<User>('POST', '/auth/login', { username, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  saveCredentials: (c: { username: string; currentPassword: string; newPassword?: string }) =>
    request<User>('PUT', '/auth/credentials', c),
};

export interface User {
  username: string;
}

export type NotificationInput = Omit<NotificationSettings, 'lastSentDate' | 'lastError'>;
