import { useState, type FormEvent } from 'react';
import { todayISO } from '../../../shared/calc';
import type { MedicationView } from '../../../shared/types';
import { api } from '../api';
import { fmtNum, parseNum } from '../format';
import { Field, Modal } from './Modal';

interface Props {
  med: MedicationView;
  onClose: () => void;
  onSaved: () => void;
}

export function CountForm({ med, onClose, onSaved }: Props) {
  const [date, setDate] = useState(todayISO());
  const [pills, setPills] = useState('');
  const [days, setDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pillsNum = parseNum(pills);
  const derivedDays = pillsNum != null && med.dailyDose ? pillsNum / med.dailyDose : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.count(med.id, { date, pills: pillsNum, days: parseNum(days) });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Conteo · ${med.name}`}
      subtitle={`Estimado hoy: ${fmtNum(med.estimatedPillsLeft)} comprimidos${med.pillsAreEstimated ? ' (aprox.)' : ''}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="form">
        <Field label="Fecha del conteo">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="grid-2">
          <Field label="Comprimidos contados">
            <input type="number" min="0" step="0.5" value={pills} onChange={(e) => setPills(e.target.value)} autoFocus />
          </Field>
          <Field
            label="Días que quedan (opcional)"
            hint={
              derivedDays != null
                ? `Si lo dejás vacío se usa ${fmtNum(derivedDays)} días (comprimidos ÷ dosis).`
                : 'Usalo si sólo sabés los días, no los comprimidos.'
            }
          >
            <input type="number" min="0" step="1" value={days} onChange={(e) => setDays(e.target.value)} />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={saving || (pills === '' && days === '')}>
            {saving ? 'Guardando…' : 'Guardar conteo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
