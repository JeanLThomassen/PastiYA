import { useEffect, useState, type FormEvent } from 'react';
import type { NotificationSettings } from '../../../shared/types';
import { api, type NotificationInput } from '../api';
import { fmtDate } from '../format';
import { Icon } from './Icon';
import { Field } from './Modal';

type Msg = { ok: boolean; text: string } | null;

export function PhoneNotifications() {
  const [saved, setSaved] = useState<NotificationSettings | null>(null);
  const [form, setForm] = useState<NotificationInput | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .notifications()
      .then((n) => {
        setSaved(n);
        setForm(n);
      })
      .catch((err) => setMsg({ ok: false, text: (err as Error).message }));
  }, []);

  if (!form) return <section className="card" id="avisos">{msg ? <p className="error">{msg.text}</p> : 'Cargando…'}</section>;

  const set = <K extends keyof NotificationInput>(k: K, v: NotificationInput[K]) => {
    setForm({ ...form, [k]: v });
    setMsg(null);
  };

  async function save(): Promise<boolean> {
    try {
      const n = await api.saveNotifications(form!);
      setSaved(n);
      return true;
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
      return false;
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (await save()) setMsg({ ok: true, text: form!.enabled ? 'Avisos activados.' : 'Ajustes guardados (avisos desactivados).' });
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    if (await save()) {
      try {
        await api.testNotification();
        setMsg({ ok: true, text: 'Mensaje de prueba enviado. Revisá el teléfono.' });
      } catch (err) {
        setMsg({ ok: false, text: (err as Error).message });
      }
    }
    setBusy(false);
  }

  return (
    <section className="card" id="avisos">
      <header className="card-head">
        <h2>
          <Icon name="phone" size={18} />
          Avisos al teléfono
        </h2>
        <label className="switch">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          <span>{form.enabled ? 'Activados' : 'Desactivados'}</span>
        </label>
      </header>

      <form className="form" onSubmit={submit}>
        <p className="muted">
          Una vez por día, si algún medicamento está sin stock o le quedan pocos días, PastiYA manda una notificación push con la lista
          para reponer.
        </p>

        <div className="grid-2">
          <Field label="Tema (topic)" hint="Es como una contraseña: no lo compartas.">
            <input value={form.ntfyTopic} onChange={(e) => set('ntfyTopic', e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Servidor">
            <input value={form.ntfyServer} onChange={(e) => set('ntfyServer', e.target.value)} />
          </Field>
        </div>
        <ol className="steps">
          <li>
            Instalá la app <strong>ntfy</strong> en el teléfono (Android o iPhone, es gratis y no pide cuenta).
          </li>
          <li>
            Tocá “+” y suscribite al tema <code>{form.ntfyTopic}</code>.
          </li>
          <li>Guardá y probá con “Enviar prueba”.</li>
        </ol>

        <div className="grid-2">
          <Field label="Avisar cuando queden (días o menos)">
            <input type="number" min="0" max="60" value={form.notifyDays} onChange={(e) => set('notifyDays', Number(e.target.value))} />
          </Field>
          <Field label="Hora del aviso diario">
            <select value={form.hour} onChange={(e) => set('hour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </Field>
        </div>

        {saved && (saved.lastSentDate || saved.lastError) && (
          <p className="muted">
            {saved.lastSentDate && `Último control automático: ${fmtDate(saved.lastSentDate)}. `}
            {saved.lastError && <span className="error">Último error: {saved.lastError}</span>}
          </p>
        )}
        {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}

        <p className="field-hint">
          El mensaje incluye el nombre de los medicamentos y pasa por el servidor de ntfy. Los avisos
          sólo salen mientras PastiYA esté funcionando en esta computadora.
        </p>

        <div className="form-actions">
          <button type="button" className="btn" onClick={test} disabled={busy}>
            Enviar prueba
          </button>
          <button className="btn primary" disabled={busy}>
            Guardar avisos
          </button>
        </div>
      </form>
    </section>
  );
}
