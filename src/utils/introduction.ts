import type { LocalDraft } from './local-draft';

export const INTRODUCTION_KEY = 'app-cie:introduction:v1';
export type IntroductionRecord = { version: 1; seen: boolean };
export function decodeIntroduction(raw: string | null): boolean {
  if (raw === null) return false;
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('seen' in value) || typeof value.seen !== 'boolean') throw new Error('Statut de présentation non reconnu.');
  return value.seen;
}
export function hasStartedJourney(draft: Pick<LocalDraft, 'setup' | 'selected' | 'equipment' | 'balanceInput' | 'resumeRoute' | 'snapshot'>): boolean {
  return draft.snapshot !== null || draft.equipment.length > 0 || draft.selected.length > 0 || draft.balanceInput !== null || draft.resumeRoute !== '/' || Object.keys(draft.setup).length > 0;
}
export function shouldIntroduce(ready: boolean, seen: boolean, started: boolean): boolean { return ready && !seen && !started; }
export const INTRODUCTION_PAGES = [
  { title: 'Comprenez votre consommation', text: 'Retrouvez les appareils qui consomment le plus chez vous.' },
  { title: 'Estimez votre autonomie', text: 'Renseignez votre solde en kWh pour estimer sa durée.' },
  { title: 'Explorez vos économies', text: 'Avec Premium, comparez vos habitudes et leurs effets estimés.' },
] as const;
