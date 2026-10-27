import { useState, type FormEvent } from 'react';
import type { Settings } from '../../../shared/types';
import { api, type User } from '../api';
import { AccountSettings } from './AccountSettings';
import { Field } from './Modal';
import { Icon } from './Icon';
import { PhoneNotifications } from './PhoneNotifications';

interface Props {
  settings: Settings;
  onSaved: (s: Settings) => void;
  user: User;
  onUserChange: (u: User) => void;
  onLogout: () => void;
}

export function SettingsView({ settings, onSaved, user, onUserChange, onLogout }: Props) {
  const [form, setForm] = useState(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: Number(e.target.value) });

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const saved = await api.saveSettings(form);
      onSaved(saved);
      setMsg({ ok: true, text: 'Ajustes guardados.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  }

  return (
    <div className="stack">
      <AccountSettings user={user} onUserChange={onUserChange} onLogout={onLogout} />

      <section className="card">
        <header className="card-head">
          <h2>Umbrales</h2>
        </header>
        <form className="form" onSubmit={submit}>
          <div className="grid-3">
            <Field label="Anticipación de compra (días)" hint="'Comprar antes de' = agotamiento − este valor.">
              <input type="number" min="0" max="90" value={form.leadDays} onChange={set('leadDays')} />
            </Field>
            <Field label="Urgente hasta (días)" hint="Días restantes para marcar URGENTE.">
              <input type="number" min="0" max="90" value={form.urgentDays} onChange={set('urgentDays')} />
            </Field>
            <Field label="Comprar pronto hasta (días)" hint="Días restantes para marcar COMPRAR PRONTO.">
              <input type="number" min="0" max="180" value={form.soonDays} onChange={set('soonDays')} />
            </Field>
          </div>
          {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
          <div className="form-actions">
            <a className="btn ghost" href="/api/export">
              <Icon name="download" size={16} />
              Descargar respaldo (JSON)
            </a>
            <button className="btn primary">Guardar ajustes</button>
          </div>
        </form>
      </section>

      <PhoneNotifications />

      <section className="card prose">
        <header className="card-head">
          <h2>Cómo usarla</h2>
        </header>
        <ol>
          <li>
            <strong>Conteo:</strong> cuando cuentes los comprimidos, usá “Conteo” en el medicamento. Si sólo sabés cuántos
            días quedan, cargá los días.
          </li>
          <li>
            <strong>Compra:</strong> al comprar, registrala. Por defecto actualiza el stock solo (fecha, comprimidos y días de
            cobertura), así no tenés que corregir el control a mano.
          </li>
          <li>
            <strong>Cálculos:</strong> los días restantes se descuentan automáticamente desde la fecha del último registro.
            Fecha de agotamiento = registro + días de cobertura; comprar antes de = agotamiento − anticipación.
          </li>
          <li>
            <strong>Estados:</strong> Sin stock (0 días), Urgente (≤ {settings.urgentDays} días), Comprar pronto (≤{' '}
            {settings.soonDays} días), OK, Falta dato (sin comprimidos ni días cargados) y A demanda (sin dosis fija).
          </li>
        </ol>
        <p className="safety">
          Esta app organiza el inventario y las fechas estimadas; no reemplaza la receta ni la indicación médica. Verificá
          nombres, presentaciones y pautas tal como aparecen en las cajas o recetas, y no cambies, suspendas ni modifiques
          ninguna dosis en base a estos cálculos.
        </p>
      </section>
    </div>
  );
}
