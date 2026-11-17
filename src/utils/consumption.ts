import { parseKWh, type ApplianceId } from './setup-params';

export const MODES = [
  { id: 'power', label: 'Puissance électrique (W)' },
  { id: 'cycle', label: 'Énergie par cycle' },
  { id: 'daily', label: 'Consommation quotidienne connue' },
  { id: 'annual', label: 'Consommation annuelle connue' },
] as const;
export type ConsumptionMode = typeof MODES[number]['id'];
export type Equipment = {
  id: string;
  type: ApplianceId;
  name: string;
  quantity: string;
  mode: ConsumptionMode;
  watts: string;
  hours: string;
  days: string;
  intermittent: boolean;
  percent: string;
  perCycle: string;
  cycles: string;
  daily: string;
  annual: string;
};
export type FieldErrors = Partial<Record<keyof Equipment | 'calculation', string>>;
export type EquipmentResult = { daily: number; errors: FieldErrors } | { daily: null; errors: FieldErrors };

export function createEquipment(id: string, type: ApplianceId): Equipment {
  return {
    id, type, name: '', quantity: '',
    mode: type === 'fridge' || type === 'freezer' ? 'daily' : type === 'washing-machine' ? 'cycle' : 'power',
    watts: '', hours: '', days: '', percent: '', perCycle: '', cycles: '', daily: '', annual: '',
    intermittent: ['air-conditioner', 'fridge', 'freezer', 'water-heater', 'iron'].includes(type),
  };
}

// Draft strings are validated before conversion; an incomplete record never contributes zero.
export function estimateEquipment(record: Equipment): EquipmentResult {
  const errors: FieldErrors = {};
  if (!record.name.trim()) errors.name = 'Donnez un nom à cette fiche.';
  function number(field: keyof Equipment, max = Number.MAX_VALUE, integer = false): number {
    const raw = record[field];
    const value = typeof raw === 'string' ? parseKWh(raw) : null;
    if (value === null) errors[field] = 'Renseignez un nombre positif ou nul (virgule ou point).';
    else if (value > max) errors[field] = `La valeur doit être inférieure ou égale à ${max}.`;
    else if (integer && (!Number.isSafeInteger(value) || value < 1)) errors[field] = 'Renseignez un entier strictement positif.';
    return value ?? 0;
  }
  const quantity = number('quantity', Number.MAX_SAFE_INTEGER, true);
  let daily = 0;
  switch (record.mode) {
    case 'power': {
      const watts = number('watts');
      const hours = number('hours', 24);
      const days = number('days', 7);
      const coefficient = record.intermittent ? number('percent', 100) / 100 : 1;
      daily = quantity * (watts / 1000) * hours * (days / 7) * coefficient;
      break;
    }
    case 'cycle': daily = quantity * number('perCycle') * (number('cycles') / 7); break;
    case 'daily': daily = quantity * number('daily'); break;
    case 'annual': daily = quantity * (number('annual') / 365); break;
    default: errors.mode = 'Choisissez un mode de consommation valide.';
  }
  if (!Number.isFinite(daily)) errors.calculation = 'Ces valeurs dépassent la capacité de calcul. Vérifiez les unités et les quantités.';
  return { daily: Object.keys(errors).length ? null : daily, errors };
}

export function estimateInventory(records: Equipment[], selected: ApplianceId[]) {
  const active = records.filter((record) => selected.includes(record.type));
  const missing = selected.filter((type) => !active.some((record) => record.type === type));
  const entries = active.map((record) => ({ record, ...estimateEquipment(record) }));
  const sum = entries.reduce((total, entry) => total + (entry.daily ?? 0), 0);
  const complete = selected.length > 0 && missing.length === 0 && entries.every((entry) => entry.daily !== null) && Number.isFinite(sum);
  return { entries, missing, complete, total: complete ? sum : null };
}

export function autonomyDays(balance: number | null, daily: number | null): number | null {
  if (balance === null || daily === null || !Number.isFinite(balance) || !Number.isFinite(daily) || balance < 0 || daily < 0) return null;
  if (daily === 0) return null;
  if (balance === 0) return 0;
  const days = balance / daily;
  return Number.isFinite(days) ? days : null;
}

// Only presentation rounds. Preserve very small non-zero values rather than showing zero.
export function formatEstimate(value: number): string {
  return value.toLocaleString('fr-FR', value !== 0 && Math.abs(value) < 0.01
    ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: 2 });
}
