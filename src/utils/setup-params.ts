export type SetupParams = {
  firstName?: string | string[];
  avatar?: string | string[];
  fromDashboard?: string | string[];
  homeName?: string | string[];
  commune?: string | string[];
  category?: string | string[];
  amperage?: string | string[];
  balanceStatus?: string | string[];
  balanceKWh?: string | string[];
  validatedAt?: string | string[];
  appliances?: string | string[];
};

export const APPLIANCES = [
  { id: 'air-conditioner', label: 'Climatiseur' },
  { id: 'fridge', label: 'Réfrigérateur' },
  { id: 'freezer', label: 'Congélateur' },
  { id: 'fan', label: 'Ventilateur' },
  { id: 'tv', label: 'Télévision' },
  { id: 'lighting', label: 'Éclairage' },
  { id: 'water-heater', label: 'Chauffe-eau' },
  { id: 'washing-machine', label: 'Machine à laver' },
  { id: 'iron', label: 'Fer à repasser' },
  { id: 'other', label: 'Autre appareil' },
] as const;

export type ApplianceId = typeof APPLIANCES[number]['id'];
export type Balance = { kWh: number; validatedAt: string } | { kWh: null; validatedAt: null };

// Repeated or malformed parameters are not silently accepted as scalar values.
export function scalar(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function parseKWh(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function readBalance(params: SetupParams): Balance {
  // String(number) may use scientific notation for very small or large balances.
  const raw = scalar(params.balanceKWh);
  const numeric = Number(raw);
  const kWh = raw !== '' && raw === String(numeric) && Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
  const validatedAt = scalar(params.validatedAt);
  const time = Date.parse(validatedAt);
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(validatedAt);
  if (scalar(params.balanceStatus) !== 'known' || kWh === null ||
      !Number.isFinite(time) || (dateOnly ? new Date(time).toISOString().slice(0, 10) !== validatedAt : new Date(time).toISOString() !== validatedAt)) {
    return { kWh: null, validatedAt: null };
  }
  return { kWh, validatedAt };
}

export function balanceParams(balance: Balance) {
  return balance.kWh === null
    ? { balanceStatus: 'unknown' }
    : { balanceStatus: 'known', balanceKWh: String(balance.kWh), validatedAt: balance.validatedAt };
}

export function householdParams(params: SetupParams) {
  const category = scalar(params.category);
  const amperage = scalar(params.amperage);
  return {
    homeName: scalar(params.homeName) || 'Ma maison',
    commune: scalar(params.commune),
    category: ['social', 'general'].includes(category) ? category : 'unknown',
    amperage: ['5', '10', '15', '20', 'other'].includes(amperage) ? amperage : 'unknown',
  };
}

export function readAppliances(value: SetupParams['appliances']): ApplianceId[] {
  const ids = scalar(value).split(',');
  return APPLIANCES.filter(({ id }) => ids.includes(id)).map(({ id }) => id);
}

export function toggleAppliance(selected: ApplianceId[], id: ApplianceId): ApplianceId[] {
  return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
}
