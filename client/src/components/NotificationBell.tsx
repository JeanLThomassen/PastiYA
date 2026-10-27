import { useEffect, useRef, useState } from 'react';
import type { Alert } from '../../../shared/types';
import { Icon } from './Icon';

interface Props {
  alerts: Alert[];
  onSelect: (medicationId: string) => void;
  onConfigure: () => void;
}

const SEEN_KEY = 'pastiya:seenAlerts';

/** Identifica una alerta por medicamento, estado y día restante: si empeora, vuelve a contar como nueva. */
const signature = (a: Alert) => `${a.medicationId}:${a.status}:${a.remainingDays == null ? '-' : Math.floor(a.remainingDays)}`;

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function NotificationBell({ alerts, onSelect, onConfigure }: Props) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(loadSeen);
  const ref = useRef<HTMLDivElement>(null);

  const unseen = alerts.filter((a) => !seen.has(signature(a))).length;

  useEffect(() => {
    if (!open) return;
    const next = new Set(alerts.map(signature));
    setSeen(next);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
    } catch {
      // Sin almacenamiento local: el contador vuelve a aparecer al recargar.
    }
  }, [open, alerts]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        className={`bell ${open ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={`Notificaciones${unseen ? `: ${unseen} nuevas` : ''}`}
        aria-expanded={open}
      >
        <Icon name="bell" size={20} />
        {unseen > 0 && <span className="bell-count">{unseen > 9 ? '9+' : unseen}</span>}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Notificaciones">
          <header>
            <strong>Notificaciones</strong>
            <span className="muted">{alerts.length ? `${alerts.length} por reponer` : 'Todo en orden'}</span>
          </header>
          {alerts.length === 0 ? (
            <p className="bell-empty">
              <Icon name="check" size={22} />
              Ningún medicamento está por acabarse.
            </p>
          ) : (
            <ul>
              {alerts.map((a) => (
                <li key={a.medicationId}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      onSelect(a.medicationId);
                    }}
                  >
                    <span className={`dot s-${a.status}`} aria-hidden />
                    <span className="bell-item">
                      <strong>{a.name}</strong>
                      <span className="muted">{a.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <footer>
            <button
              className="link-btn"
              onClick={() => {
                setOpen(false);
                onConfigure();
              }}
            >
              <Icon name="phone" size={16} />
              Configurar avisos al teléfono
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
