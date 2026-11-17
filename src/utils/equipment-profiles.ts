import type { Equipment } from './consumption';
import type { ApplianceId } from './setup-params';

export type ProfileSettings = Pick<Equipment, 'mode'> & Partial<Pick<Equipment,
  'watts' | 'hours' | 'days' | 'intermittent' | 'percent' | 'perCycle' | 'cycles' | 'daily' | 'annual'>>;
export type EquipmentProfile = {
  id: string;
  type: ApplianceId;
  label: string;
  settings: ProfileSettings;
  assumptions: string[];
  provenance: string;
  validation: 'provisional';
};

// These values are deliberately NOT a market reference or an accuracy guarantee.
// No verified manufacturer data or documented profile was found in the project.
// Replace or validate this versioned catalogue before launch; do not source it from test fixtures.
const provenance = 'Hypothèses internes de prototype pour tester le parcours. Aucune mesure ni référence fabricant vérifiée.';
function profile(type: ApplianceId, slug: string, label: string, settings: ProfileSettings, assumptions: string[]): EquipmentProfile {
  return { id: `prototype-v1-${slug}`, type, label, settings, assumptions, provenance, validation: 'provisional' };
}
export const EQUIPMENT_PROFILES: readonly EquipmentProfile[] = [
  profile('air-conditioner', 'ac-a', 'Scénario clim A',
    { mode: 'power', watts: '900', hours: '6', days: '7', intermittent: true, percent: '65' },
    ['Puissance électrique supposée : 900 W ; fonctionnement actif supposé : 65 %.', 'Usage proposé : 6 h/jour, 7 jours/semaine.', 'Aucune déduction à partir de la taille de la pièce ou des BTU/h.']),
  profile('air-conditioner', 'ac-b', 'Scénario clim B',
    { mode: 'power', watts: '1500', hours: '8', days: '7', intermittent: true, percent: '55' },
    ['Puissance électrique supposée : 1 500 W ; fonctionnement actif supposé : 55 %.', 'Usage proposé : 8 h/jour, 7 jours/semaine.', 'Scénario alternatif, sans correspondance garantie avec votre climatiseur.']),
  profile('fridge', 'fridge-daily', 'Froid · scénario quotidien',
    { mode: 'daily', daily: '0.85' },
    ['Consommation supposée par appareil : 0,85 kWh/jour.', 'Le fonctionnement du froid est inclus ; aucune réduction liée aux heures ou jours d’usage.']),
  profile('fridge', 'fridge-annual', 'Froid · scénario annuel',
    { mode: 'annual', annual: '400' },
    ['Consommation supposée par appareil : 400 kWh/an, répartis sur 365 jours.', 'Aucune consommation déduite du volume ou de la taille ; aucune réduction d’usage.']),
  profile('freezer', 'freezer', 'Congélateur · scénario prototype',
    { mode: 'daily', daily: '1.05' },
    ['Consommation supposée : 1,05 kWh/jour par appareil.', 'Fonctionnement du froid inclus, sans réduction liée aux jours ou heures d’usage.']),
  profile('fan', 'fan-a', 'Ventilateur · scénario A',
    { mode: 'power', watts: '45', hours: '6', days: '7', intermittent: false },
    ['Puissance d’utilisation supposée : 45 W, coefficient constant 1.', 'Usage proposé : 6 h/jour, 7 jours/semaine.']),
  profile('fan', 'fan-b', 'Ventilateur · scénario B',
    { mode: 'power', watts: '70', hours: '6', days: '7', intermittent: false },
    ['Puissance d’utilisation supposée : 70 W, coefficient constant 1.', 'Usage proposé : 6 h/jour, 7 jours/semaine.']),
  profile('tv', 'tv', 'Télévision · scénario prototype',
    { mode: 'power', watts: '80', hours: '3', days: '7', intermittent: false },
    ['Puissance supposée : 80 W pendant l’usage, coefficient 1.', 'Usage proposé : 3 h/jour, 7 jours/semaine ; la taille seule ne détermine pas la consommation.']),
  profile('lighting', 'lighting', 'Éclairage LED · scénario prototype',
    { mode: 'power', watts: '7', hours: '6', days: '7', intermittent: false },
    ['Puissance supposée : 7 W par lampe, coefficient 1.', 'Usage proposé : 6 h/jour, 7 jours/semaine. À adapter si vos lampes sont différentes.']),
  profile('water-heater', 'water-heater', 'Chauffe-eau · scénario par chauffe',
    { mode: 'cycle', perCycle: '1.4', cycles: '5' },
    ['Énergie supposée : 1,4 kWh par cycle de chauffe.', 'Usage proposé : 5 cycles de chauffe par semaine ; dépend du matériel et de l’eau chauffée.']),
  profile('washing-machine', 'washing-machine', 'Lavage · scénario par cycle',
    { mode: 'cycle', perCycle: '0.65', cycles: '4' },
    ['Énergie supposée : 0,65 kWh par cycle.', 'Usage proposé : 4 cycles/semaine ; à adapter au programme réel.']),
  profile('iron', 'iron', 'Repassage · scénario prototype',
    { mode: 'power', watts: '1100', hours: '0.5', days: '2', intermittent: true, percent: '65' },
    ['Puissance supposée : 1 100 W ; thermostat actif supposé : 65 %.', 'Usage proposé : 30 min/jour, 2 jours/semaine.']),
  profile('other', 'other', 'Autre · scénario à adapter',
    { mode: 'power', watts: '75', hours: '2', days: '3', intermittent: false },
    ['Scénario de test générique : 75 W, coefficient 1 ; ne représente aucun appareil identifié.', 'Usage proposé : 2 h/jour, 3 jours/semaine. À remplacer dès que l’appareil est connu.']),
];

export function profilesFor(type: ApplianceId): readonly EquipmentProfile[] {
  // Keep the old generic scenario addressable for existing drafts, but never
  // propose it for a new unidentified appliance.
  return EQUIPMENT_PROFILES.filter((item) => item.type === type && type !== 'other');
}
export function findProfile(id: string): EquipmentProfile | undefined {
  return EQUIPMENT_PROFILES.find((item) => item.id === id);
}

// Tactile usage suggestions, never inferred from appliance size.
export function durationChoices(type: ApplianceId): readonly number[] {
  switch (type) {
    case 'air-conditioner': return [0, 2, 4, 6, 8, 12];
    case 'fan': return [0, 2, 4, 6, 10, 16];
    case 'tv': return [0, 1, 2, 3, 5, 8];
    case 'lighting': return [0, 2, 4, 6, 8, 12];
    case 'iron': return [0, 0.25, 0.5, 1, 2];
    default: return [0, 0.5, 1, 2, 4, 8];
  }
}
export const DAY_CHOICES = [0, 1, 2, 3, 5, 7] as const;
export const CYCLE_CHOICES = [0, 1, 2, 4, 5, 7, 14] as const;
