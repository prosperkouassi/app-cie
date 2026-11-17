import { autonomyDays } from './consumption';
import { validateScenario, type SavedScenario } from './saved-scenarios';
import { estimateConfiguredInventory, type ConfiguredEquipment } from './quick-equipment';
import { APPLIANCES, readBalance, type ApplianceId, type SetupParams } from './setup-params';

export const STORAGE_KEY = 'app-cie:draft';
export type DiscoverySnapshot = {
  total: number; autonomy: number | null; params: SetupParams;
  primaryName: string | null; provisional: boolean; createdAt: string;
};
export type LocalDraft = {
  version: 1 | 2; scenarios?: SavedScenario[]; setup: SetupParams; resumeRoute: string; balanceInput: string | null;
  selected: ApplianceId[]; equipment: ConfiguredEquipment[]; snapshot: DiscoverySnapshot | null;
};
export const SETUP_ROUTES = ['/', '/abonnement', '/solde', '/appareils', '/configuration-appareils'] as const;
export function createSnapshot(equipment: ConfiguredEquipment[], selected: ApplianceId[], params: SetupParams): DiscoverySnapshot | null {
  const inventory = estimateConfiguredInventory(equipment, selected);
  if (inventory.total === null) return null;
  const primary = [...inventory.entries].sort((a, b) => (b.daily ?? 0) - (a.daily ?? 0))[0];
  return { total: inventory.total, autonomy: autonomyDays(readBalance(params).kWh, inventory.total),
    params: { ...params }, primaryName: primary && (primary.daily ?? 0) > 0 ? primary.record.name : null, provisional: inventory.estimated.length > 0, createdAt: new Date().toISOString() };
}
function isObject(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function paramsValid(value: unknown): value is SetupParams { return isObject(value) && Object.values(value).every((v) => typeof v === 'string'); }
export function validEquipment(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (value.iconKey !== undefined && (typeof value.iconKey !== 'string' || !['computer', 'kettle', 'oven', 'microwave', 'vacuum', 'cooker'].includes(value.iconKey))) return false;
  if (!APPLIANCES.some((a) => a.id === value.type) || !['power', 'cycle', 'daily', 'annual'].includes(String(value.mode))) return false;
  if (!['id', 'name', 'quantity', 'watts', 'hours', 'days', 'percent', 'perCycle', 'cycles', 'daily', 'annual'].every((key) => typeof value[key] === 'string') || typeof value.intermittent !== 'boolean') return false;
  const originsValid = (origins: unknown) => isObject(origins) && Object.values(origins).every((v) => ['proposed', 'confirmed', 'custom'].includes(String(v)));
  return (value.valueOrigins === undefined || originsValid(value.valueOrigins)) && (value.quick === undefined || (isObject(value.quick) && typeof value.quick.profileId === 'string' && ['proposed', 'confirmed'].includes(String(value.quick.state)) && originsValid(value.quick.origins)));
}
export function decodeDraft(raw: string): LocalDraft {
  const data: unknown = JSON.parse(raw);
  if (!isObject(data) || (data.version !== 1 && data.version !== 2) || !paramsValid(data.setup) || !SETUP_ROUTES.includes(data.resumeRoute as typeof SETUP_ROUTES[number]) ||
      !(data.balanceInput === null || typeof data.balanceInput === 'string') || !Array.isArray(data.selected) || !data.selected.every((id) => APPLIANCES.some((a) => a.id === id)) ||
      !Array.isArray(data.equipment) || !data.equipment.every(validEquipment)) throw new Error('Sauvegarde locale non reconnue.');
  if (new Set(data.equipment.map((item) => item.id)).size !== data.equipment.length) throw new Error('Identifiants dupliqués.');
  if (data.snapshot !== null) {
    const s = data.snapshot;
    if (!isObject(s) || typeof s.total !== 'number' || !Number.isFinite(s.total) || s.total < 0 ||
      !(s.autonomy === null || (typeof s.autonomy === 'number' && Number.isFinite(s.autonomy) && s.autonomy >= 0)) ||
      !paramsValid(s.params) || !(s.primaryName === null || typeof s.primaryName === 'string') || typeof s.provisional !== 'boolean' || typeof s.createdAt !== 'string' || !Number.isFinite(Date.parse(s.createdAt))) throw new Error('Instantané local non reconnu.');
  }
  if (data.version === 2) {
    if (!Array.isArray(data.scenarios)) throw new Error('Scénarios locaux non reconnus.');
    for (const entry of data.scenarios) {
      if (!isObject(entry) || typeof entry.id !== 'string' || !entry.id ||
        !['createdAt', 'modifiedAt'].every(key => typeof entry[key] === 'string' && Number.isFinite(Date.parse(entry[key] as string))) ||
        !Array.isArray(entry.reference) || !entry.reference.every(validEquipment) || !Array.isArray(entry.simulated) || !entry.simulated.every(validEquipment) ||
        !Array.isArray(entry.selected) || !paramsValid(entry.reading)) throw new Error('Scénario local invalide.');
      validateScenario(entry as unknown as SavedScenario);
    }
    if (new Set(data.scenarios.map(s => s.id)).size !== data.scenarios.length) throw new Error('Scénarios dupliqués.');
  }
  return { ...data, version: 2, scenarios: data.version === 1 ? [] : data.scenarios } as unknown as LocalDraft;
}
