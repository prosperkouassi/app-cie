import { estimateEquipment, type Equipment } from './consumption';
import { estimateConfiguredInventory, SETTING_LABELS, type ConfiguredEquipment } from './quick-equipment';
import { APPLIANCES, type ApplianceId } from './setup-params';

export type ConfigurationIssue = {
  kind: 'profile' | 'missing' | 'invalid' | 'overflow' | 'selection';
  name: string;
  field: keyof Equipment | 'calculation' | 'profile' | 'selection';
  label: string;
  message: string;
  recordId?: string;
  type?: ApplianceId;
};
export const ISSUE_LABELS: Record<ConfigurationIssue['kind'], string> = {
  profile: 'Profil à confirmer', missing: 'Fiche absente', invalid: 'Saisie invalide',
  overflow: 'Dépassement numérique', selection: 'Sélection manquante',
};
export function equipmentName(record: Equipment): string {
  return record.name.trim() || APPLIANCES.find((item) => item.id === record.type)?.label || 'Appareil sans nom';
}

export function configurationIssues(records: ConfiguredEquipment[], selected: ApplianceId[]): ConfigurationIssue[] {
  const inventory = estimateConfiguredInventory(records, selected);
  const issues: ConfigurationIssue[] = [];
  if (selected.length === 0) issues.push({ kind: 'selection', name: 'Vos équipements', field: 'selection', label: 'Types sélectionnés', message: 'Sélectionnez au moins un type à l’étape 4.' });
  // Match the display order so the first issue is also the first one on screen.
  for (const { id: type, label } of APPLIANCES.filter((item) => selected.includes(item.id))) {
    const active = records.filter((record) => record.type === type);
    if (!active.length) issues.push({ kind: 'missing', name: label, type, field: 'selection', label: 'Fiche', message: 'Ajoutez une première fiche pour ce type.' });
    for (const record of active) {
      const identity = { recordId: record.id, type, name: equipmentName(record) };
      if (inventory.invalidProfiles.includes(record)) issues.push({ ...identity, kind: 'profile', field: 'profile', label: 'Profil', message: 'Profil introuvable ou incompatible. Choisissez un profil disponible ou conservez les valeurs en configuration manuelle.' });
      else if (record.quick?.state === 'proposed') issues.push({ ...identity, kind: 'profile', field: 'profile', label: 'Profil', message: 'Les hypothèses présentées restent à confirmer.' });
      const { errors } = estimateEquipment(record);
      for (const field of Object.keys(errors) as (keyof typeof errors)[]) {
        if (field === 'calculation') continue;
        const raw = record[field];
        issues.push({ ...identity, kind: 'invalid', field,
          label: field === 'name' ? 'Nom' : field === 'id' || field === 'type' ? field : SETTING_LABELS[field],
          message: typeof raw === 'string' && !raw.trim() ? 'Champ obligatoire manquant.' : errors[field] ?? 'Valeur invalide.',
        });
      }
      if (errors.calculation && Object.keys(errors).length === 1) issues.push({ ...identity, kind: 'overflow', field: 'calculation', label: 'Calcul de consommation', message: errors.calculation });
    }
  }
  // Detect a sum overflow separately, only when all individual calculations succeeded.
  if (inventory.entries.length > 0 && inventory.entries.every((entry) => entry.daily !== null) &&
    !Number.isFinite(inventory.entries.reduce((sum, entry) => sum + (entry.daily ?? 0), 0))) {
    const largest = inventory.entries.reduce((current, entry) => (entry.daily ?? 0) > (current.daily ?? 0) ? entry : current).record;
    issues.push({ kind: 'overflow', name: `Ensemble des appareils, dont ${equipmentName(largest)}`, recordId: largest.id, type: largest.type, field: 'calculation', label: 'Consommation totale', message: 'La somme dépasse la capacité numérique. Vérifiez les unités, en commençant par ce plus grand contributeur.' });
  }
  return issues;
}
