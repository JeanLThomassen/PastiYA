import { useMemo, useState } from 'react';
import type { Purchase } from '../../../shared/types';
import { fmtDate, fmtDays, fmtNum } from '../format';
import { Icon } from './Icon';

interface Props {
  purchases: Purchase[];
  onNew: () => void;
  onDelete: (p: Purchase) => void;
}

export function PurchasesView({ purchases, onNew, onDelete }: Props) {
  const [medFilter, setMedFilter] = useState('');
  const names = useMemo(() => [...new Set(purchases.map((p) => p.medicationName))].sort(), [purchases]);
  const visible = medFilter ? purchases.filter((p) => p.medicationName === medFilter) : purchases;
  const totalBoxes = visible.reduce((acc, p) => acc + p.boxes, 0);

  return (
    <section className="card">
      <header className="card-head">
        <h2>Registro de compras</h2>
        <div className="head-actions">
          {names.length > 1 && (
            <select value={medFilter} onChange={(e) => setMedFilter(e.target.value)} aria-label="Filtrar por medicamento">
              <option value="">Todos</option>
              {names.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          )}
          <button className="btn primary" onClick={onNew}>
            <Icon name="plus" size={16} />
            Registrar compra
          </button>
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="empty">
          <Icon name="cart" size={28} />
          Todavía no hay compras registradas.
        </p>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Medicamento</th>
                  <th className="num">Cajas</th>
                  <th className="num">Comp./caja</th>
                  <th className="num">Total</th>
                  <th className="num">Dosis/día</th>
                  <th className="num">Quedaban</th>
                  <th className="num">Cobertura tras compra</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.date)}</td>
                    <td>
                      {p.medicationName}
                      {!p.appliedToStock && <span className="tag">no aplicada al stock</span>}
                    </td>
                    <td className="num">{p.boxes}</td>
                    <td className="num">{p.pillsPerBox}</td>
                    <td className="num">{p.totalPills}</td>
                    <td className="num">{p.dailyDose != null ? fmtNum(p.dailyDose) : 'a demanda'}</td>
                    <td className="num">{fmtDays(p.daysBefore)}</td>
                    <td className="num">{fmtDays(p.coverageAfter)}</td>
                    <td>
                      <button className="icon-btn" onClick={() => onDelete(p)} aria-label={`Eliminar compra de ${p.medicationName}`}>
                        <Icon name="trash" size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted foot-note">
            {visible.length} compras · {totalBoxes} cajas. Eliminar una compra no revierte el stock: si hace falta, corregilo con un conteo.
          </p>
        </>
      )}
    </section>
  );
}
