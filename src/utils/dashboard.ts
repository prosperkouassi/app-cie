import { autonomyDays } from './consumption';
import { editEquipment, type ConfiguredEquipment } from './quick-equipment';

// Presentation only: the bar and consumption engine retain their exact values.
export function formatShare(value: number | null, total: number | null): string {
  return value === null || total === null ? 'Part indéterminée' : `${Math.round(barPercent(value, total))} % du total`;
}

export function formatReadingDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // A date without a time must not shift to the previous day in another timezone.
    return date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }
  return `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDuration(days: number | null): string {
  if (days === null || !Number.isFinite(days) || days < 0) return 'Durée indéterminée';
  if (days * 24 < 1) return 'Moins d’une heure';
  const hours = Math.round(days * 24);
  if (!Number.isSafeInteger(hours)) return 'Durée indéterminée';
  const wholeDays = Math.floor(hours / 24);
  const rest = hours % 24;
  return [wholeDays ? `${wholeDays} jour${wholeDays > 1 ? 's' : ''}` : '', rest ? `${rest} heure${rest > 1 ? 's' : ''}` : ''].filter(Boolean).join(' et ');
}
export function autonomyLabel(balance: number | null, daily: number | null) {
  if (balance === null) return 'Renseignez votre solde';
  if (balance === 0) return 'Crédit épuisé au moment du relevé';
  return formatDuration(autonomyDays(balance, daily));
}
export function barPercent(value: number | null, total: number | null): number {
  return value !== null && total !== null && Number.isFinite(value) && Number.isFinite(total) && total > 0
    ? Math.min(100, Math.max(0, value / total * 100)) : 0;
}
export function cloneScenario(records: ConfiguredEquipment[]): ConfiguredEquipment[] {
  return records.map((record) => ({ ...record, valueOrigins: record.valueOrigins && { ...record.valueOrigins },
    quick: record.quick && { ...record.quick, origins: { ...record.quick.origins } } }));
}
export function scenarioField(record: ConfiguredEquipment): 'hours' | 'cycles' | null {
  if (record.type === 'fridge' || record.type === 'freezer') return null;
  return record.mode === 'power' ? 'hours' : record.mode === 'cycle' ? 'cycles' : null;
}
export function changeScenario(record: ConfiguredEquipment, value: string): ConfiguredEquipment {
  const field = scenarioField(record);
  return field ? editEquipment(record, { [field]: value }) : record;
}
export function compareConsumption(current: number | null, scenario: number | null) {
  if (current === null || scenario === null) return null;
  const difference = current - scenario;
  const month = difference * 30;
  const percent = current > 0 ? difference / current * 100 : null;
  if (!Number.isFinite(month) || (percent !== null && !Number.isFinite(percent))) return null;
  return { difference, month, percent };
}
