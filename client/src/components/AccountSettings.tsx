import { useState, type FormEvent } from 'react';
import { api, type User } from '../api';
import { Icon } from './Icon';
import { Field } from './Modal';

interface Props {
  user: User;
  onUserChange: (u: User) => void;
  onLogout: () => void;
}

export function AccountSettings({ user, onUserChange, onLogout }: Props) {
  const [username, setUsername] = useState(user.username);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword && newPassword !== repeat) return setMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden.' });
    setBusy(true);
    try {
      const u = await api.saveCredentials({ username, currentPassword, newPassword: newPassword || undefined });
      onUserChange(u);
      setCurrentPassword('');
      setNewPassword('');
      setRepeat('');
      setMsg({ ok: true, text: newPassword ? 'Usuario y contraseña actualizados.' : 'Usuario actualizado.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  return (
    <section className="card">
      <header className="card-head">
        <h2>
          <Icon name="user" size={18} />
          Usuario y contraseña
        </h2>
        <button className="btn small ghost" onClick={onLogout}>
          <Icon name="logout" size={15} />
          Cerrar sesión
        </button>
      </header>
      <form className="form" onSubmit={submit}>
        <p className="muted">
          Sesión iniciada como <strong>{user.username}</strong>. Para cambiar los datos de acceso, confirmá la contraseña actual.
        </p>
        <div className="grid-2">
          <Field label="Usuario">
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Contraseña actual">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Field label="Nueva contraseña" hint="Opcional. Mínimo 8 caracteres.">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Repetir nueva contraseña">
            <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar acceso'}
          </button>
        </div>
      </form>
    </section>
  );
}
