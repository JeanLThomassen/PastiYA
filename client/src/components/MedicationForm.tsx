import { useState, type FormEvent } from 'react';
import { todayISO } from '../../../shared/calc';
import type { MedicationInput, MedicationView } from '../../../shared/types';
import { api } from '../api';
import { numToInput, parseNum } from '../format';
import { Field, Modal } from './Modal';

interface Props {
  med: MedicationView | null;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (m: MedicationView) => void;
}

export function MedicationForm({ med, onClose, onSaved, onDelete }: Props) {
  const [name, setName] = useState(med?.name ?? '');
  const [pillsPerBox, setPillsPerBox] = useState(numToInput(med?.pillsPerBox));
  const [dailyDose, setDailyDose] = useState(numToInput(med?.dailyDose));
  const [onDemand, setOnDemand] = useState(med ? med.dailyDose == null : false);
  const [recordDate, setRecordDate] = useState(med?.recordDate ?? todayISO());
  const [pills, setPills] = useState(numToInput(med?.pillsAvailable));
  const [days, setDays] = useState(numToInput(med?.coverageDays));
  const [notes, setNotes] = useState(med?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dose = onDemand ? null : parseNum(dailyDose);
  const pillsNum = parseNum(pills);
  const suggestedDays = dose && pillsNum != null ? Math.round((pillsNum / dose) * 100) / 100 : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!onDemand && dose == null) return setError('Indicá la dosis diaria o marcá "uso a demanda".');
    const input: MedicationInput = {
      name,
      pillsPerBox: parseNum(pillsPerBox),
      dailyDose: dose,
      recordDate,
      pillsAvailable: pillsNum,
      coverageDays: onDemand ? null : (parseNum(days) ?? suggestedDays),
      notes,
    };
    setSaving(true);
    try {
      if (med) await api.updateMedication(med.id, input);
      else await api.createMedication(input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal title={med ? `Editar ${med.name}` : 'Nuevo medicamento'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Comprimidos por caja">
            <input type="number" min="1" step="1" value={pillsPerBox} onChange={(e) => setPillsPerBox(e.target.value)} />
          </Field>
          <Field label="Dosis indicada (comp./día)">
            <input
              type="number"
              min="0"
              step="0.25"
              value={onDemand ? '' : dailyDose}
              disabled={onDemand}
              onChange={(e) => setDailyDose(e.target.value)}
            />
          </Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={onDemand} onChange={(e) => setOnDemand(e.target.checked)} />
          Uso a demanda (sin pauta diaria fija)
        </label>

        <fieldset className="fieldset">
          <legend>Stock al momento del registro</legend>
          <Field label="Fecha del registro">
            <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} required />
          </Field>
          <div className="grid-2">
            <Field label="Comprimidos disponibles" hint="Dejalo vacío si no se contaron.">
              <input type="number" min="0" step="0.5" value={pills} onChange={(e) => setPills(e.target.value)} />
            </Field>
            {!onDemand && (
              <Field
                label="Días de cobertura"
                hint={suggestedDays != null ? `Según el conteo: ${suggestedDays} días.` : 'Base para estimar el agotamiento.'}
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={days}
                  placeholder={suggestedDays != null ? String(Math.floor(suggestedDays)) : ''}
                  onChange={(e) => setDays(e.target.value)}
                />
              </Field>
            )}
          </div>
        </fieldset>

        <Field label="Notas / dato pendiente">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          {med && (
            <button type="button" className="btn danger push-left" onClick={() => onDelete(med)}>
              Eliminar
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
