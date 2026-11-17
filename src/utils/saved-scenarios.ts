import { cloneScenario, compareConsumption } from './dashboard';
import { estimateConfiguredInventory, type ConfiguredEquipment } from './quick-equipment';
import { APPLIANCES, readBalance, type ApplianceId, type SetupParams } from './setup-params';

export type SavedScenario = {
  id: string; name: string; createdAt: string; modifiedAt: string;
  reference: ConfiguredEquipment[]; simulated: ConfiguredEquipment[];
  selected: ApplianceId[]; reading: SetupParams;
};
export type ScenarioInput = Pick<SavedScenario, 'name' | 'reference' | 'simulated' | 'selected' | 'reading'>;
export function scenarioTotals(s: ScenarioInput) {
  const current = estimateConfiguredInventory(s.reference, s.selected);
  const simulated = estimateConfiguredInventory(s.simulated, s.selected);
  return { current, simulated, comparison: compareConsumption(current.total, simulated.total) };
}
export function validateScenario(input: ScenarioInput) {
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 60) throw new Error('Choisissez un nom de 1 à 60 caractères.');
  if (!input.selected.length || new Set(input.selected).size !== input.selected.length || !input.selected.every(id => APPLIANCES.some(a => a.id === id))) throw new Error('Inventaire invalide.');
  for (const records of [input.reference, input.simulated]) {
    if (!records.length || new Set(records.map(r => r.id)).size !== records.length || records.some(r => !r.id || !input.selected.includes(r.type))) throw new Error('Appareils invalides.');
  }
  if (input.reference.length !== input.simulated.length || input.reference.some(r => !input.simulated.some(s => s.id === r.id && s.type === r.type))) throw new Error('La simulation ne correspond pas à sa référence.');
  const { current, simulated } = scenarioTotals(input);
  if (current.total === null || simulated.total === null || !Number.isFinite(current.total) || !Number.isFinite(simulated.total)) throw new Error('Complétez les réglages valides de tous les appareils avant d’enregistrer.');
  if (Object.values(input.reading).some(v => typeof v !== 'string')) throw new Error('Contexte de relevé invalide.');
  if (input.reading.balanceStatus === 'known' && readBalance(input.reading).kWh === null) throw new Error('Solde de référence invalide.');
}
let sequence = 0;
export function saveScenario(input: ScenarioInput, previous?: SavedScenario): SavedScenario {
  validateScenario(input);
  const now = new Date().toISOString();
  return { id: previous?.id ?? `scenario-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name.trim(), createdAt: previous?.createdAt ?? now, modifiedAt: now,
    reference: cloneScenario(input.reference), simulated: cloneScenario(input.simulated), selected: [...input.selected], reading: { ...input.reading } };
}
export function householdChanged(s: SavedScenario, equipment: ConfiguredEquipment[], selected: ApplianceId[]) {
  return JSON.stringify(s.reference) !== JSON.stringify(equipment.filter(r => selected.includes(r.type))) || JSON.stringify([...s.selected].sort()) !== JSON.stringify([...selected].sort());
}
