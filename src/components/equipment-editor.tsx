import { EquipmentIcon, otherIcons } from './equipment-icon';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { estimateEquipment, MODES, type Equipment } from '@/utils/consumption';
import { editEquipment, SETTING_LABELS, type ConfiguredEquipment } from '@/utils/quick-equipment';
import { usedSettings } from '@/utils/quick-equipment';
import { type ConfigurationIssue } from '@/utils/configuration-validation';
import { equipmentStyles as styles } from './equipment-step';
import { QuickEquipmentControls } from './quick-equipment-controls';

type EditableField = Exclude<keyof Equipment, 'id' | 'type' | 'mode' | 'intermittent'>;
function editable(field: string): field is EditableField {
  return ['name', 'quantity', 'watts', 'hours', 'days', 'percent', 'perCycle', 'cycles', 'daily', 'annual'].includes(field);
}
export function EquipmentEditor({ record, onChange, onDelete, revealErrors = false, problem, ordinal }: {
  record: ConfiguredEquipment; onChange: (record: ConfiguredEquipment) => void; onDelete: () => void;
  revealErrors?: boolean; problem?: ConfigurationIssue & { resolved?: boolean };
  ordinal?: number;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const { errors } = estimateEquipment(record);
  const expanded = refineOpen || revealErrors;
  const primaryField = problem?.kind === 'invalid' && editable(problem.field) ? problem.field
    : null;
  function commit(updated: ConfiguredEquipment) {
    onChange(updated.quick && JSON.stringify(updated) !== JSON.stringify(record) ? { ...updated, quick: { ...updated.quick, state: 'proposed' } } : updated);
  }
  const customActive = usedSettings(record).some(setting => setting.origin === 'custom');
  const title = `${ordinal ? `${ordinal}. ` : ''}${record.name.trim() || 'Nouvelle fiche'}`;
  function field(key: EditableField, label: string, hint?: string, primary = false) {
    if (key === primaryField && !primary) return null;
    return <View style={local.field} key={key}>
      <Text style={styles.text}>{label}</Text>
      <TextInput accessibilityLabel={`${label} — ${record.name || 'Nouvelle fiche'}`}
        accessibilityHint={hint} value={record[key]} onChangeText={(value) => commit(editEquipment(record, { [key]: value }))}
        keyboardType={key === 'name' ? 'default' : key === 'quantity' ? 'number-pad' : 'decimal-pad'}
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} selectionColor="#4E8425"
        placeholder={key === 'name' ? 'Nom de cet appareil' : 'À renseigner'} placeholderTextColor="#68738A"
        style={[local.input, !!errors[key] && local.invalid]} />
      {!!hint && <Text style={styles.note}>{hint}</Text>}
      {!!errors[key] && <Text style={local.error}>{errors[key]}</Text>}
    </View>;
  }
  return <View style={styles.card}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><EquipmentIcon type={record.type} iconKey={record.iconKey} size={44} /><Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text></View>
    {customActive && <Text style={styles.note}>Réglages personnalisés actifs</Text>}
    {problem && !problem.resolved && <Text accessibilityRole="alert" style={local.error}>{problem.name} · {problem.label} : {problem.message}</Text>}
    {primaryField && field(primaryField, primaryField === 'name' ? 'Nom' : SETTING_LABELS[primaryField], undefined, true)}
    <QuickEquipmentControls record={record} onChange={commit} onAdvanced={() => setRefineOpen(true)} />
    <Pressable accessibilityRole="button" accessibilityLabel="Réglages avancés" accessibilityState={{ expanded }} aria-expanded={expanded}
      onPress={() => setRefineOpen((open) => !open)} style={styles.choice}>
      <Text style={styles.link}>Réglages avancés</Text><Text style={styles.mark}>{expanded ? '⌃' : '⌄'}</Text>
    </Pressable>
    {expanded && <View style={{ gap: 12 }}>
    {record.type === 'other' && <View style={{ gap: 8 }}><Text style={styles.text}>Icône · facultatif</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.entries(otherIcons).map(([iconKey, item]) => <Pressable key={iconKey} accessibilityRole="button" accessibilityLabel={`Icône ${item.label}`} accessibilityState={{ selected: record.iconKey === iconKey }} style={[styles.choice, { padding: 8, borderColor: record.iconKey === iconKey ? '#4E8425' : '#DFE6E5' }]} onPress={() => onChange({ ...record, iconKey })}><EquipmentIcon type="other" iconKey={iconKey} size={36} /><Text style={styles.note}>{item.label}</Text></Pressable>)}</View><Text style={styles.note}>L’icône ne modifie ni le type ni le calcul.</Text></View>}
    <QuickEquipmentControls record={record} onChange={commit} advanced detailsOnly />
    {field('name', 'Nom')}
    {field('quantity', 'Quantité', 'Une quantité commune convient uniquement à des appareils de mêmes caractéristiques et usages. Sinon, créez des fiches distinctes.')}
    <Text style={styles.sectionTitle}>Mode de consommation</Text>
    {MODES.map(({ id, label }) => <Pressable key={id} accessibilityRole="radio"
      accessibilityState={{ checked: record.mode === id }} aria-checked={record.mode === id} onPress={() => commit(editEquipment(record, { mode: id }))}
      style={[styles.choice, record.mode === id && styles.selected]}>
      <Text style={styles.choiceText}>{label}</Text><Text style={styles.mark}>{record.mode === id ? '●' : '○'}</Text>
    </Pressable>)}
    {!!errors.mode && <Text style={local.error}>{errors.mode}</Text>}
    {(record.type === 'fridge' || record.type === 'freezer') && <Text style={styles.note}>
      Privilégiez les kWh/jour ou kWh/an indiqués sur l’étiquette ou mesurés. La puissance nominale multipliée par 24 h ne représente pas le fonctionnement réel du compresseur.
    </Text>}
    {record.mode === 'power' && <>
      {field('watts', 'Puissance électrique par appareil (W)', record.type === 'air-conditioner'
        ? 'Utilisez la puissance électrique absorbée en W. La capacité de refroidissement en BTU/h n’est pas une puissance électrique et ne se saisit pas ici.' : undefined)}
      {field('hours', 'Heures par jour (0 à 24)')}
      {field('days', 'Jours par semaine (0 à 7)')}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: record.intermittent }} aria-checked={record.intermittent}
        onPress={() => commit(editEquipment(record, { intermittent: !record.intermittent }))} style={styles.choice}>
        <Text style={styles.choiceText}>Fonctionnement intermittent / thermostat</Text>
        <Text style={styles.mark}>{record.intermittent ? '✓' : '+'}</Text>
      </Pressable>
      {record.intermittent ? field('percent', 'Part de fonctionnement actif (0 à 100 %)',
        'Hypothèse modifiable : pendant les heures indiquées, quelle part du temps l’appareil consomme-t-il la puissance saisie ? Ce pourcentage est une hypothèse, pas une mesure.')
        : <Text style={styles.note}>Puissance d’utilisation constante pendant les heures saisies : coefficient 1 (100 %), sans coefficient technique à renseigner.</Text>}
    </>}
    {record.mode === 'cycle' && <>{field('perCycle', 'Énergie par appareil et par cycle (kWh)')}{field('cycles', 'Cycles par semaine')}</>}
    {record.mode === 'daily' && field('daily', 'Consommation par appareil (kWh/jour)')}
    {record.mode === 'annual' && field('annual', 'Consommation par appareil (kWh/an)')}
    {!!errors.calculation && <Text accessibilityRole="alert" style={local.error}>{errors.calculation}</Text>}
    </View>}
    {expanded && <>{confirmDelete ? <>
      <Text style={local.error}>Supprimer cette fiche et ses saisies ?</Text>
      <Pressable accessibilityRole="button" onPress={onDelete} style={styles.back}><Text style={local.error}>Confirmer la suppression</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(false)} style={styles.back}><Text style={styles.link}>Conserver la fiche</Text></Pressable>
    </> : <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setConfirmDelete(true); }} style={styles.back}>
      <Text style={local.error}>Supprimer cette fiche</Text>
    </Pressable>}</>}
  </View>;
}

const local = StyleSheet.create({
  field: { gap: 6 },
  input: { minHeight: 52, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#9AA3B5', color: '#142142', fontSize: 17 },
  invalid: { borderColor: '#A30062' },
  error: { color: '#A30062', fontSize: 14, lineHeight: 21 },
});
