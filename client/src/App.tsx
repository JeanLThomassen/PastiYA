import { useCallback, useEffect, useState } from 'react';
import { todayISO } from '../../shared/calc';
import type { Alert, MedicationView, Purchase, Settings } from '../../shared/types';
import { api, STALE_EVENT, UNAUTH_EVENT, type User } from './api';
import { Login } from './components/Login';
import { CountForm } from './components/CountForm';
import { Dashboard } from './components/Dashboard';
import { MedicationForm } from './components/MedicationForm';
import { Icon, Logo } from './components/Icon';
import { NotificationBell } from './components/NotificationBell';
import type { IconName } from './icons';
import { PurchaseForm } from './components/PurchaseForm';
import { PurchasesView } from './components/PurchasesView';
import { SettingsView } from './components/SettingsView';
import { fmtDate } from './format';

type Tab = 'dashboard' | 'purchases' | 'settings';
type Dialog =
  | { kind: 'med'; med: MedicationView | null }
  | { kind: 'count'; med: MedicationView }
  | { kind: 'buy'; medId?: string }
  | null;

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Tablero', icon: 'pillbox' },
  { id: 'purchases', label: 'Compras', icon: 'cart' },
  { id: 'settings', label: 'Ajustes', icon: 'sliders' },
];

/** Muestra el ingreso hasta que haya una sesión válida. */
export default function App() {
  // undefined = verificando sesión; null = sin sesión.
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    api.me().then(setUser, () => setUser(null));
    const onUnauth = () => setUser(null);
    window.addEventListener(UNAUTH_EVENT, onUnauth);
    return () => window.removeEventListener(UNAUTH_EVENT, onUnauth);
  }, []);

  if (user === undefined) return <p className="empty">Cargando…</p>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <MainApp
      user={user}
      onUserChange={setUser}
      onLogout={async () => {
        await api.logout().catch(() => undefined);
        setUser(null);
      }}
    />
  );
}

interface MainProps {
  user: User;
  onUserChange: (u: User) => void;
  onLogout: () => void;
}

function MainApp({ user, onUserChange, onLogout }: MainProps) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [meds, setMeds] = useState<MedicationView[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [m, p, s, a] = await Promise.all([api.medications(), api.purchases(), api.settings(), api.alerts()]);
      setMeds(m);
      setPurchases(p);
      setSettings(s);
      setAlerts(a);
      setError(null);
    } catch (err) {
      setError(`No se pudo conectar con el servidor: ${(err as Error).message}`);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Mantener los datos al día si cambiaron en el servidor (otra pestaña, base recreada, etc.).
  useEffect(() => {
    const onStale = () => {
      setDialog(null);
      setNotice('Los datos habían cambiado y se recargaron. Volvé a intentarlo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      reload();
      setTimeout(() => setNotice(null), 6000);
    };
    const onVisible = () => document.visibilityState === 'visible' && reload();
    window.addEventListener(STALE_EVENT, onStale);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(STALE_EVENT, onStale);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const close = useCallback(() => setDialog(null), []);
  const saved = useCallback(() => {
    setDialog(null);
    reload();
  }, [reload]);

  async function deleteMed(m: MedicationView) {
    if (!confirm(`¿Eliminar ${m.name}? Las compras registradas se conservan.`)) return;
    try {
      await api.deleteMedication(m.id);
      saved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deletePurchase(p: Purchase) {
    if (!confirm(`¿Eliminar la compra de ${p.medicationName} del ${fmtDate(p.date)}?`)) return;
    try {
      await api.deletePurchase(p.id);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={40} />
          <div>
            <h1>PastiYA</h1>
            <p>Control y reposición de medicamentos · hoy {fmtDate(todayISO())}</p>
          </div>
        </div>
        <div className="nav-group">
          <NotificationBell
            alerts={alerts}
            onSelect={(medId) => {
              setTab('dashboard');
              setDialog({ kind: 'buy', medId });
            }}
            onConfigure={() => {
              setTab('settings');
              setTimeout(() => document.getElementById('avisos')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
          />
          <nav className="tabs" aria-label="Secciones">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} size={17} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="content">
        {error && <p className="error banner">{error}</p>}
        {notice && <p className="notice banner">{notice}</p>}
        {!settings ? (
          !error && <p className="empty">Cargando…</p>
        ) : tab === 'dashboard' ? (
          <Dashboard
            meds={meds}
            settings={settings}
            onNew={() => setDialog({ kind: 'med', med: null })}
            onEdit={(med) => setDialog({ kind: 'med', med })}
            onCount={(med) => setDialog({ kind: 'count', med })}
            onBuy={(med) => setDialog({ kind: 'buy', medId: med.id })}
          />
        ) : tab === 'purchases' ? (
          <PurchasesView purchases={purchases} onNew={() => setDialog({ kind: 'buy' })} onDelete={deletePurchase} />
        ) : (
          <SettingsView
            settings={settings}
            onSaved={(s) => (setSettings(s), reload())}
            user={user}
            onUserChange={onUserChange}
            onLogout={onLogout}
          />
        )}
      </main>

      <footer className="footer">
        No reemplaza la receta ni la indicación médica. Ante dudas sobre una dosis, consultá con el médico o la farmacia.
      </footer>

      {dialog?.kind === 'med' && (
        <MedicationForm med={dialog.med} onClose={close} onSaved={saved} onDelete={deleteMed} />
      )}
      {dialog?.kind === 'count' && <CountForm med={dialog.med} onClose={close} onSaved={saved} />}
      {dialog?.kind === 'buy' && (
        <PurchaseForm meds={meds} initialMedId={dialog.medId} onClose={close} onSaved={saved} />
      )}
    </div>
  );
}
