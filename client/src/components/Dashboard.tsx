import { useMemo, useState } from 'react';
import { STATUS_ORDER, todayISO } from '../../../shared/calc';
import type { MedicationView, Settings, Status } from '../../../shared/types';
import { fmtDate, fmtDays, fmtNum, STATUS_LABEL } from '../format';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';

interface Props {
  meds: MedicationView[];
  settings: Settings;
  onNew: () => void;
  onEdit: (m: MedicationView) => void;
  onCount: (m: MedicationView) => void;
  onBuy: (m: MedicationView) => void;
}

const KPI_STATUSES: Status[] = ['SIN_STOCK', 'URGENTE', 'COMPRAR_PRONTO', 'OK', 'FALTA_DATO', 'A_DEMANDA'];
const TO_BUY: Status[] = ['SIN_STOCK', 'URGENTE', 'COMPRAR_PRONTO'];

function sortMeds(a: MedicationView, b: MedicationView) {
  const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  if (s !== 0) return s;
  return (a.remainingDays ?? Infinity) - (b.remainingDays ?? Infinity) || a.name.localeCompare(b.name);
}

export function Dashboard({ meds, settings, onNew, onEdit, onCount, onBuy }: Props) {
  const [filter, setFilter] = useState<Status | null>(null);
  const [query, setQuery] = useState('');
  const today = todayISO();

  const counts = useMemo(() => {
    const c = Object.fromEntries(KPI_STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const m of meds) c[m.status]++;
    return c;
  }, [meds]);

  const toBuy = useMemo(() => meds.filter((m) => TO_BUY.includes(m.status)).sort(sortMeds), [meds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meds
      .filter((m) => (!filter || m.status === filter) && (!q || m.name.toLowerCase().includes(q)))
      .sort(sortMeds);
  }, [meds, filter, query]);

  const barMax = Math.max(settings.soonDays * 3, 30);

  return (
    <div className="stack">
      <section className="kpis" aria-label="Resumen por estado">
        {KPI_STATUSES.map((s) => (
          <button
            key={s}
            className={`kpi k-${s} ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(filter === s ? null : s)}
            aria-pressed={filter === s}
          >
            <span className="kpi-value">{counts[s]}</span>
            <span className="kpi-label">{STATUS_LABEL[s]}</span>
          </button>
        ))}
      </section>

      {toBuy.length > 0 && (
        <section className="card">
          <header className="card-head">
            <h2>Lista de compras</h2>
            <span className="muted">{toBuy.length} para reponer</span>
          </header>
          <ul className="buy-list">
            {toBuy.map((m) => (
              <li key={m.id}>
                <span className={`dot s-${m.status}`} aria-hidden />
                <div className="buy-main">
                  <strong>{m.name}</strong>
                  <span className="muted">
                    {m.status === 'SIN_STOCK'
                      ? 'Sin stock: comprar ya'
                      : `Quedan ${fmtDays(m.remainingDays)} · ${
                          m.buyBefore && m.buyBefore < today ? 'comprar ya' : `comprar antes del ${fmtDate(m.buyBefore)}`
                        }`}
                  </span>
                </div>
                <button className="btn small" onClick={() => onBuy(m)}>
                  <Icon name="cart" size={15} />
                  Registrar compra
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <header className="card-head">
          <h2>
            Medicamentos
            {filter && (
              <button className="chip" onClick={() => setFilter(null)} aria-label={`Quitar filtro ${STATUS_LABEL[filter]}`}>
                {STATUS_LABEL[filter]}
                <Icon name="close" size={12} />
              </button>
            )}
          </h2>
          <div className="head-actions">
            <label className="search-wrap">
              <Icon name="search" size={16} />
              <input
                className="search"
                type="search"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar medicamento"
              />
            </label>
            <button className="btn primary" onClick={onNew}>
              <Icon name="plus" size={16} />
              Agregar
            </button>
          </div>
        </header>

        {visible.length === 0 ? (
          <p className="empty">
            <Icon name="pill" size={28} />
            No hay medicamentos que coincidan.
          </p>
        ) : (
          <div className="med-list">
            {visible.map((m) => {
              const pct = m.remainingDays == null ? 0 : Math.min(100, (m.remainingDays / barMax) * 100);
              return (
                <article key={m.id} className={`med s-border-${m.status}`}>
                  <div className="med-top">
                    <div>
                      <h3>{m.name}</h3>
                      <p className="muted">
                        {m.dailyDose ? `${fmtNum(m.dailyDose)} comp./día` : 'A demanda'}
                        {m.pillsPerBox ? ` · caja x${m.pillsPerBox}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>

                  <div className="med-cover">
                    <div className="cover-label">
                      <strong>{m.remainingDays == null ? 'Sin dato' : fmtDays(m.remainingDays)}</strong>
                      <span className="muted">
                        {m.estimatedPillsLeft != null &&
                          `${m.pillsAreEstimated ? '~' : ''}${fmtNum(m.estimatedPillsLeft)} comp.`}
                      </span>
                    </div>
                    <div className="bar" aria-hidden>
                      <div className={`bar-fill s-${m.status}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <dl className="med-dates">
                    <div>
                      <dt>Se agota</dt>
                      <dd>{fmtDate(m.depletionDate)}</dd>
                    </div>
                    <div>
                      <dt>Comprar antes de</dt>
                      <dd className={m.buyBefore && m.buyBefore < today && m.dailyDose ? 'overdue' : ''}>
                        {fmtDate(m.buyBefore)}
                      </dd>
                    </div>
                    <div>
                      <dt>Último registro</dt>
                      <dd>{fmtDate(m.recordDate)}</dd>
                    </div>
                    <div>
                      <dt>Última compra</dt>
                      <dd>{fmtDate(m.lastPurchaseDate)}</dd>
                    </div>
                  </dl>

                  {(m.warnings.length > 0 || m.notes) && (
                    <div className="med-notes">
                      {m.warnings.map((w) => (
                        <p key={w} className="warn">
                          <Icon name="warning" size={16} />
                          <span>{w}</span>
                        </p>
                      ))}
                      {m.notes && <p className="muted">{m.notes}</p>}
                    </div>
                  )}

                  <div className="med-actions">
                    <button className="btn small" onClick={() => onCount(m)}>
                      <Icon name="count" size={15} />
                      Conteo
                    </button>
                    <button className="btn small" onClick={() => onBuy(m)}>
                      <Icon name="cart" size={15} />
                      Compra
                    </button>
                    <button className="btn small ghost" onClick={() => onEdit(m)}>
                      <Icon name="edit" size={15} />
                      Editar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
