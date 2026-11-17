import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { estimateEquipment, formatEstimate } from '@/utils/consumption';
import { CYCLE_CHOICES, DAY_CHOICES, durationChoices, findProfile, profilesFor } from '@/utils/equipment-profiles';
import { editEquipment, ORIGIN_LABELS, previewProfileChange, SETTING_LABELS, settingText, stepQuantity, usedSettings, valueOrigin, type ConfiguredEquipment } from '@/utils/quick-equipment';
import { parseKWh } from '@/utils/setup-params';
import { equipmentStyles as styles } from './equipment-step';

export function QuickEquipmentControls({ record, onChange, advanced = false, detailsOnly = false, onAdvanced }: {
  record: ConfiguredEquipment; onChange: (record: ConfiguredEquipment) => void; advanced?: boolean; detailsOnly?: boolean; onAdvanced?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [customField, setCustomField] = useState('');

  const profile = record.quick && findProfile(record.quick.profileId);
  const pendingProfile = pendingId ? findProfile(pendingId) : undefined;
  const preview = pendingProfile ? previewProfileChange(record, pendingProfile) : null;
  const currentDaily = estimateEquipment(record).daily;
  const previewDaily = preview ? estimateEquipment(preview.candidate).daily : null;
  const errors = estimateEquipment(record).errors;
  const cold = record.type === 'fridge' || record.type === 'freezer';
  const availableProfiles = profilesFor(record.type);

  function choices(field: 'hours' | 'days' | 'cycles', options: readonly number[], unit: string) {
    const value = parseKWh(record[field]);
    const isCustom = customField === field || valueOrigin(record, field) === 'custom' || (value !== null && !options.includes(value));
    return <View style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{SETTING_LABELS[field]}</Text>
      {isCustom && <Text style={styles.note}>Personnalisé actif : {record[field]} {unit}</Text>}
      <View style={local.row}>
        {options.map((option) => <Pressable key={option} accessibilityRole="radio"
          accessibilityLabel={`${SETTING_LABELS[field]} : ${option} ${unit}`}
          accessibilityState={{ checked: value === option }} aria-checked={value === option}
          onPress={() => { setCustomField(''); onChange(editEquipment(record, { [field]: String(option) }, 'confirmed')); }}
          style={[local.chip, value === option && styles.selected]}>
          <Text style={styles.link}>{value === option ? '✓ ' : ''}{String(option).replace('.', ',')} {unit}</Text>
        </Pressable>)}
        <Pressable accessibilityRole="button" onPress={() => { setCustomField(field); onAdvanced?.(); }} style={local.chip}>
          <Text style={styles.link}>Personnalisé</Text>
        </Pressable>
      </View>
      {advanced && isCustom && <TextInput accessibilityLabel={`${SETTING_LABELS[field]} personnalisé`}
        value={record[field]} onChangeText={(text) => onChange(editEquipment(record, { [field]: text }))}
        keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
        placeholder="Votre valeur" placeholderTextColor="#68738A" style={local.input} selectionColor="#4E8425" />}
      {!!errors[field] && <Text style={styles.error}>{errors[field]}</Text>}
    </View>;
  }
  return <View style={{ gap: 14 }}>
    {!detailsOnly && <View style={local.quantity}>
      <Text style={styles.text}>Quantité</Text>
      <View style={local.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Diminuer la quantité"
          accessibilityState={{ disabled: parseKWh(record.quantity) === 1 }} disabled={parseKWh(record.quantity) === 1}
          onPress={() => onChange(stepQuantity(record, -1))} style={local.stepper}><Text style={styles.link}>−</Text></Pressable>
        <Text style={styles.text}>{record.quantity || '—'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Augmenter la quantité"
          onPress={() => onChange(stepQuantity(record, 1))} style={local.stepper}><Text style={styles.link}>+</Text></Pressable>
      </View>
    </View>}
    {!detailsOnly && !!errors.quantity && <Text style={styles.error}>{errors.quantity}</Text>}
    {advanced && <>
    {!record.quick && <Text style={styles.note}>Vos valeurs personnalisées sont conservées. Ouvrir ce mode ne les remplace pas. Vous pouvez garder cette configuration ou prévisualiser un profil.</Text>}
    {availableProfiles.length === 0 && !record.quick ? <Text style={styles.text}>Aucun profil adapté : renseignez la consommation connue ou choisissez un autre mode ci-dessous.</Text>
      : <Text style={styles.sectionTitle}>Profil estimatif{record.quick?.state === 'proposed' ? ' · proposé' : record.quick ? ' · confirmé' : ' · facultatif'}</Text>}
    {availableProfiles.map((item) => <Pressable key={item.id} accessibilityRole="button"
      accessibilityLabel={`Prévisualiser ${item.label}`} onPress={() => setPendingId(item.id)}
      style={[styles.choice, profile && profile.id === item.id && styles.selected]}>
      <Text style={styles.choiceText}>{item.label}</Text>
    </Pressable>)}
    {(availableProfiles.length > 0 || record.quick) && <Text style={styles.note}>Hypothèses provisoires de prototype à valider avant lancement. Résultat indicatif, sans précision garantie.</Text>}
    {record.quick && !profile && <Pressable accessibilityRole="button" onPress={() => onChange({ ...record, quick: undefined, valueOrigins: record.quick?.origins })} style={styles.choice}>
      <Text style={styles.link}>Conserver mes valeurs en configuration manuelle</Text>
    </Pressable>}
    {profile && <>
      <Text style={styles.note}>Provenance : {profile.provenance} Statut : provisoire, non validé.</Text>
      <Text style={styles.note}>Hypothèses initiales du profil :</Text>
      {profile.assumptions.map((assumption) => <Text key={assumption} style={styles.note}>• {assumption}</Text>)}
    </>}
    </>}
    {!detailsOnly && !cold && record.mode === 'power' && <>
      {choices('hours', durationChoices(record.type), 'h')}
      {choices('days', DAY_CHOICES, 'j/sem.')}
    </>}
    {!detailsOnly && record.mode === 'cycle' && choices('cycles', CYCLE_CHOICES, 'cycles/sem.')}
    {cold && advanced && <Text style={styles.note}>Le froid n’est pas réduit selon les heures ou jours d’usage. Le profil utilise des kWh/jour ou kWh/an, sans demander le temps de branchement.</Text>}
    {advanced && usedSettings(record).map((item) => <Text key={item.field} style={styles.note}>{item.label} : {item.value} · {ORIGIN_LABELS[item.origin]}</Text>)}
    {advanced && preview && pendingProfile && <View style={styles.help}>
      <Text style={styles.sectionTitle}>Effet du changement de profil</Text>
      <Text style={styles.text}>{pendingProfile.label} · Profil estimatif provisoire, non validé.</Text>
      <Text style={styles.text}>Consommation indicative : {currentDaily === null ? 'incomplète' : `${formatEstimate(currentDaily)} kWh/jour`} → {previewDaily === null ? 'incomplète' : `${formatEstimate(previewDaily)} kWh/jour`}.</Text>
      {preview.changes.map((change) => <Text key={change.field} style={styles.text}>
        {SETTING_LABELS[change.field]} : {settingText(change.field, change.before)} → {settingText(change.field, change.after)}{change.replacesCustom ? ' · remplace une valeur personnalisée' : ''}
      </Text>)}
      {preview.changes.length === 0 && <Text style={styles.text}>Les valeurs sont identiques ; seule l’association au profil et sa confirmation changent.</Text>}
      <Text style={styles.text}>Le nom, l’identifiant et la quantité sont conservés. Les réglages listés seront remplacés uniquement après confirmation.</Text>
      <Text style={styles.note}>Provenance : {pendingProfile.provenance}</Text>
      {pendingProfile.assumptions.map((assumption) => <Text key={assumption} style={styles.note}>• {assumption}</Text>)}
      <Pressable accessibilityRole="button" onPress={() => { onChange(preview.candidate); setPendingId(null); }} style={styles.button}>
        <Text style={styles.buttonText}>Confirmer le changement de profil</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setPendingId(null)} style={styles.back}><Text style={styles.link}>Garder mes réglages</Text></Pressable>
    </View>}
  </View>;
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quantity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepper: { minWidth: 52, minHeight: 48, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#9AA3B5', justifyContent: 'center' },
  input: { minHeight: 52, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#9AA3B5', color: '#142142', fontSize: 17 },
});
