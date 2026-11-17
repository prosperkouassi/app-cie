import { createEquipment, estimateInventory, MODES, type Equipment } from './consumption';
import { findProfile, profilesFor, type EquipmentProfile } from './equipment-profiles';
import { APPLIANCES, parseKWh, type ApplianceId } from './setup-params';

export type Setting = Exclude<keyof Equipment, 'id' | 'type' | 'name'>;
export type ValueOrigin = 'proposed' | 'confirmed' | 'custom';
export const ORIGIN_LABELS: Record<ValueOrigin, string> = {
  proposed: 'Proposé · à confirmer', confirmed: 'Choix confirmé', custom: 'Personnalisé',
};
export const SETTING_LABELS: Record<Setting, string> = {
  quantity: 'Quantité', mode: 'Mode', watts: 'Puissance électrique (W)', hours: 'Heures/jour',
  days: 'Jours/semaine', intermittent: 'Fonctionnement', percent: 'Temps actif (%)',
  perCycle: 'kWh/cycle', cycles: 'Cycles/semaine', daily: 'kWh/jour', annual: 'kWh/an',
};
export function settingText(field: Setting, value: string | boolean): string {
  if (field === 'mode') return MODES.find((mode) => mode.id === value)?.label ?? String(value);
  if (field === 'intermittent') return value === true || value === 'true' ? 'Intermittent' : 'Constant';
  return String(value).replace('.', ',') || 'Non renseigné';
}
export type ConfiguredEquipment = Equipment & {
  iconKey?: string;
  // Legacy/manual sheets can record tactile choices without adopting a profile.
  valueOrigins?: Partial<Record<Setting, ValueOrigin>>;
  quick?: {
    profileId: string;
    state: 'proposed' | 'confirmed';
    origins: Partial<Record<Setting, ValueOrigin>>;
  };
};

export function createQuickEquipment(id: string, type: ApplianceId): ConfiguredEquipment {
  const profile = profilesFor(type)[0];
  const base = createEquipment(id, type);
  const name = `${APPLIANCES.find((item) => item.id === type)?.label} ${id.replace('equipment-', '')}`;
  if (!profile) return { ...base, name, quantity: '1', mode: 'daily',
    valueOrigins: { quantity: 'proposed', mode: 'proposed' } };
  const origins: Partial<Record<Setting, ValueOrigin>> = { quantity: 'proposed' };
  for (const key of Object.keys(profile.settings) as Setting[]) origins[key] = 'proposed';
  return { ...base, ...profile.settings, quantity: '1',
    name,
    quick: { profileId: profile.id, state: 'proposed', origins },
  };
}

// Existing records without metadata are custom. Reading them never changes their values.
export function valueOrigin(record: ConfiguredEquipment, field: Setting): ValueOrigin {
  return record.quick?.origins[field] ?? record.valueOrigins?.[field] ?? 'custom';
}
export function usedSettings(record: ConfiguredEquipment) {
  const fields: Setting[] = ['quantity'];
  if (record.mode === 'power') fields.push('watts', 'hours', 'days', 'intermittent', ...(record.intermittent ? ['percent' as const] : []));
  if (record.mode === 'cycle') fields.push('perCycle', 'cycles');
  if (record.mode === 'daily') fields.push('daily');
  if (record.mode === 'annual') fields.push('annual');
  return fields.map((field) => ({ field, label: SETTING_LABELS[field], value: settingText(field, record[field]), origin: valueOrigin(record, field) }));
}
export function editEquipment(record: ConfiguredEquipment, patch: Partial<Equipment>, origin: ValueOrigin = 'custom'): ConfiguredEquipment {
  const origins = { ...(record.quick?.origins ?? record.valueOrigins) };
  for (const key of Object.keys(patch) as (keyof Equipment)[]) {
    if (key !== 'name' && key !== 'id' && key !== 'type') origins[key] = origin;
  }
  return record.quick ? { ...record, ...patch, quick: { ...record.quick, origins } }
    : { ...record, ...patch, valueOrigins: origins };
}
export function confirmQuickEquipment(record: ConfiguredEquipment): ConfiguredEquipment {
  if (!record.quick) return record;
  const origins = { ...record.quick.origins };
  for (const key of Object.keys(origins) as Setting[]) if (origins[key] === 'proposed') origins[key] = 'confirmed';
  return { ...record, quick: { ...record.quick, state: 'confirmed', origins } };
}

// Produces a preview only; the caller must explicitly confirm before committing it.
// Name, identity and quantity are always retained. Unused fields are retained as well.
export function previewProfileChange(record: ConfiguredEquipment, profile: EquipmentProfile) {
  if (record.type !== profile.type) throw new Error('Ce profil ne correspond pas au type de la fiche.');
  const origins = { ...(record.quick?.origins ?? record.valueOrigins) };
  const changes: { field: Setting; before: string; after: string; replacesCustom: boolean }[] = [];
  for (const field of Object.keys(profile.settings) as Setting[]) {
    const after = profile.settings[field as keyof typeof profile.settings];
    if (record[field] !== after) {
      changes.push({ field, before: String(record[field]), after: String(after), replacesCustom: valueOrigin(record, field) === 'custom' });
      origins[field] = 'confirmed';
    }
  }
  const candidate: ConfiguredEquipment = {
    ...record, ...profile.settings, quick: { profileId: profile.id, state: 'confirmed', origins },
  };
  return { candidate: confirmQuickEquipment(candidate), changes };
}

export function stepQuantity(record: ConfiguredEquipment, direction: -1 | 1): ConfiguredEquipment {
  const parsed = parseKWh(record.quantity);
  const quantity = parsed !== null && Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
  const next = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, quantity + direction));
  return editEquipment(record, { quantity: String(next) }, 'confirmed');
}

export function estimateConfiguredInventory(records: ConfiguredEquipment[], selected: ApplianceId[]) {
  const inventory = estimateInventory(records, selected);
  const active = records.filter((record) => selected.includes(record.type));
  // Keep UI provenance alongside the unchanged engine's calculation results.
  const entries = inventory.entries.map((entry, index) => ({ ...entry, record: active[index] }));
  const pending = records.filter((record) => selected.includes(record.type) && record.quick?.state === 'proposed');
  const estimated = records.filter((record) => selected.includes(record.type) && record.quick !== undefined);
  // An invalid/missing profile cannot silently turn into a confirmed estimate.
  const invalidProfiles = estimated.filter((record) => !record.quick || findProfile(record.quick.profileId)?.type !== record.type);
  const complete = inventory.complete && pending.length === 0 && invalidProfiles.length === 0;
  return { ...inventory, entries, complete, total: complete ? inventory.total : null, pending, estimated, invalidProfiles };
}

// Idempotent reconciliation: keep existing and inactive sheets verbatim.
export function ensureFirstEquipment(records: ConfiguredEquipment[], candidates: ConfiguredEquipment[]): ConfiguredEquipment[] {
  let result = records;
  for (const candidate of candidates) {
    if (!result.some((record) => record.type === candidate.type)) result = [...result, candidate];
  }
  return result;
}

export type PresentedProfile = { recordId: string; profileId: string; fingerprint: string };
export function presentedProfiles(records: ConfiguredEquipment[], selected: ApplianceId[]): PresentedProfile[] {
  return records.filter((record) => selected.includes(record.type) && record.quick?.state === 'proposed' &&
    findProfile(record.quick.profileId)?.type === record.type).map((record) => ({
      recordId: record.id, profileId: record.quick?.profileId ?? '', fingerprint: JSON.stringify(record),
    }));
}
export function confirmPresentedProfiles(records: ConfiguredEquipment[], presented: PresentedProfile[]): ConfiguredEquipment[] {
  return records.map((record) => presented.some((item) => item.recordId === record.id &&
    item.profileId === record.quick?.profileId && item.fingerprint === JSON.stringify(record)) &&
    record.quick?.state === 'proposed' ? confirmQuickEquipment(record) : record);
}
