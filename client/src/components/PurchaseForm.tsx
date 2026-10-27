import { useMemo, useState, type FormEvent } from 'react';
import { todayISO } from '../../../shared/calc';
import type { MedicationView } from '../../../shared/types';
import { api } from '../api';
import { fmtDays, fmtNum, numToInput, parseNum } from '../format';
import { Field, Modal } from './Modal';

interface Props {
  meds: MedicationView[];
  initialMedId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function PurchaseForm({ meds, initialMedId, onClose, onSaved }: Props) {
  const sorted = useMemo(() => [...meds].sort((a, b) => a.name.localeCompare(b.name)), [meds]);
  const [medId, setMedId] = useState(initialMedId ?? sorted[0]?.id ?? '');
  const med = meds.find((m) => m.id === medId);

  const [date, setDate] = useState(todayISO());
  const [boxes, setBoxes] = useState('1');
  const [pillsPerBox, setPillsPerBox] = useState(numToInput(med?.pillsPerBox));
  const [dose, setDose] = useState(numToInput(med?.dailyDose));
  const [daysBefore, setDaysBefore] = useState(med?.remainingDays != null ? String(Math.floor(med.remainingDays)) : '');
  const [apply, setApply] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function selectMed(id: string) {
    const m = meds.find((x) => x.id === id);
    setMedId(id);
    setPillsPerBox(numToInput(m?.pillsPerBox));
    setDose(numToInput(m?.dailyDose));
    setDaysBefore(m?.remainingDays != null ? String(Math.floor(m.remainingDays)) : '');
  }

  const boxesNum = parseNum(boxes) ?? 0;
  const ppb = parseNum(pillsPerBox) ?? 0;
  const doseNum = parseNum(dose);
  const before = parseNum(daysBefore);
  const total = boxesNum * ppb;
  const coverageAfter = doseNum && doseNum > 0 ? (before ?? 0) + total / doseNum : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.createPurchase({
        date,
        medicationId: medId,
        boxes: boxesNum,
        pillsPerBox: ppb,
        dailyDose: doseNum && doseNum > 0 ? doseNum : null,
        daysBefore: before,
        applyToStock: apply,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Registrar compra" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="grid-2">
          <Field label="Medicamento">
            <select value={medId} onChange={(e) => selectMed(e.target.value)} required>
              {sorted.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de compra">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Cajas">
            <input type="number" min="1" step="1" value={boxes} onChange={(e) => setBoxes(e.target.value)} required />
          </Field>
          <Field label="Comp. por caja">
            <input type="number" min="1" step="1" value={pillsPerBox} onChange={(e) => setPillsPerBox(e.target.value)} required />
          </Field>
          <Field label="Dosis/día">
            <input type="number" min="0" step="0.25" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="a demanda" />
          </Field>
        </div>
        <Field label="Días que quedaban antes de comprar" hint="Precargado con la estimación actual; corregilo si sabés el dato real.">
          <input type="number" min="0" step="1" value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} />
        </Field>

        <div className="calc-strip">
          <div>
            <span className="muted">Total comprimidos</span>
            <strong>{fmtNum(total)}</strong>
          </div>
          <div>
            <span className="muted">Cobertura tras la compra</span>
            <strong>{coverageAfter != null ? fmtDays(coverageAfter) : '—'}</strong>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
          Actualizar el stock del medicamento con esta compra
        </label>

        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={saving || !medId}>
            {saving ? 'Guardando…' : 'Registrar compra'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
