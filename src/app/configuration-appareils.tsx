import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { withSetupAccess } from '@/components/access-gate';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { EquipmentStep, equipmentStyles as styles } from '@/components/equipment-step';
import { EquipmentEditor } from '@/components/equipment-editor';
import { useSetupDraft } from '@/components/setup-draft';
import { confirmPresentedProfiles, estimateConfiguredInventory, ORIGIN_LABELS, presentedProfiles, usedSettings } from '@/utils/quick-equipment';
import { findProfile } from '@/utils/equipment-profiles';
import { configurationIssues, ISSUE_LABELS, type ConfigurationIssue } from '@/utils/configuration-validation';
import { APPLIANCES, balanceParams, householdParams, readAppliances, readBalance, type SetupParams } from '@/utils/setup-params';

function ConfigurationAppareilsScreen() {
  const { equipmentId } = useLocalSearchParams<{ equipmentId?: string }>();
  const requestedEquipment = useRef(equipmentId);
  const params = useDraftParams<SetupParams>();
  const selected = readAppliances(params.appliances);
  const { setSelected, equipment, setEquipment, addEquipment, ensureEquipment, finalizeDiscovery, snapshot } = useSetupDraft();
  const [submitted, setSubmitted] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [focusProblem, setFocusProblem] = useState<ConfigurationIssue | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const typeOffsets = useRef<Partial<Record<string, number>>>({});
  const recordOffsets = useRef<Partial<Record<string, number>>>({});
  const scrollTarget = useRef<ConfigurationIssue | null>(null);
  const selectionKey = selected.join(',');
  // Handles direct links as well as step 4. The provider reconciles without duplicates.
  useEffect(() => { ensureEquipment(readAppliances(selectionKey)); }, [ensureEquipment, selectionKey]);
  const inventory = estimateConfiguredInventory(equipment, selected);
  const presented = presentedProfiles(equipment, selected);
  const issues = submitted ? configurationIssues(equipment, selected) : [];
  const liveFocus = focusProblem && issues.find((problem) => problem.recordId === focusProblem.recordId &&
    problem.field === focusProblem.field && problem.kind === focusProblem.kind);
  const inactive = equipment.filter((record) => !selected.includes(record.type));
  const nextParams = { ...householdParams(params), ...balanceParams(readBalance(params)), appliances: selected.join(',') };
  function editSelection() {
    Keyboard.dismiss();
    setSelected(selected);
    if (params.fromDashboard === 'true') router.push({ pathname: '/appareils', params: nextParams });
    else if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/appareils', params: nextParams });
  }
  function showEstimate() {
    Keyboard.dismiss();
    const confirmed = confirmPresentedProfiles(equipment, presented);
    // Only profiles represented in this render may be confirmed, even if the draft changed.
    setEquipment((current) => confirmPresentedProfiles(current, presented));
    setSubmitted(true);
    const problems = configurationIssues(confirmed, selected);
    setRevealed((current) => [...new Set([...current, ...problems.flatMap((problem) =>
      problem.recordId && (problem.kind === 'invalid' || problem.kind === 'overflow') ? [problem.recordId] : [])])]);
    if (problems.length === 0 && estimateConfiguredInventory(confirmed, selected).complete) {
      if (!finalizeDiscovery(nextParams, confirmed, selected)) return;
      scrollTarget.current = null;
      router.push({ pathname: '/tableau-de-bord', params: nextParams });
    } else if (problems[0]) revealProblem(problems[0]);
  }
  function scrollToProblem() {
    const problem = scrollTarget.current;
    if (!problem && requestedEquipment.current) {
      const record = equipment.find(r => r.id === requestedEquipment.current);
      const typeY = record && typeOffsets.current[record.type];
      const recordY = record && recordOffsets.current[record.id];
      if (typeY !== undefined && recordY !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, typeY + recordY - 12), animated: false });
        requestedEquipment.current = undefined;
      }
    }
    if (!problem) return;
    const typeY = problem.type ? typeOffsets.current[problem.type] : undefined;
    const recordY = problem.recordId ? recordOffsets.current[problem.recordId] : 0;
    const y = typeY === undefined ? 0 : typeY + (recordY ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }
  function revealProblem(problem: ConfigurationIssue) {
    setFocusProblem(problem);
    if (problem.recordId && (problem.kind === 'invalid' || problem.kind === 'overflow')) {
      const recordId = problem.recordId;
      setRevealed((current) => [...new Set([...current, recordId])]);
    }
    scrollTarget.current = problem;
    scrollToProblem();
  }
  return <EquipmentStep step={5} title="Configurez vos appareils" params={params} onBack={editSelection} backLabel="Modifier mes appareils"
    scrollRef={scrollRef} onContentSizeChange={scrollToProblem} onScrollBeginDrag={() => { scrollTarget.current = null; }}>
    <Text style={styles.text}>Ajustez les quantités et les usages.</Text>
    {inactive.length > 0 && <View style={styles.help}>
      <Text style={styles.sectionTitle}>Fiches mises de côté : {inactive.length}</Text>
      {inactive.map((record) => <Text key={record.id} style={styles.text}>{record.name || APPLIANCES.find(({ id }) => id === record.type)?.label}</Text>)}
      <Text style={styles.text}>Leur type a été désélectionné. Ces fiches sont conservées en mémoire mais exclues du calcul. Sélectionnez à nouveau leur type pour les retrouver.</Text>
      <Pressable accessibilityRole="button" onPress={editSelection} style={styles.back}><Text style={styles.link}>Revoir les types sélectionnés</Text></Pressable>
    </View>}
    {selected.length === 0 && <Text style={styles.text}>Aucun type sélectionné. Revenez choisir vos appareils.</Text>}
    {APPLIANCES.filter(({ id }) => selected.includes(id)).map(({ id, label }) => <View key={id} style={{ gap: 14 }}
      onLayout={(event) => { typeOffsets.current[id] = event.nativeEvent.layout.y; scrollToProblem(); }}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {equipment.filter((record) => record.type === id).map((record, index) => <View key={record.id}
        onLayout={(event) => { recordOffsets.current[record.id] = event.nativeEvent.layout.y; scrollToProblem(); }}>
        <EquipmentEditor ordinal={index + 1} record={record} revealErrors={revealed.includes(record.id)}
          problem={focusProblem?.recordId === record.id ? { ...(liveFocus || focusProblem), resolved: !liveFocus } : undefined}
          onChange={(updated) => { scrollTarget.current = null; setEquipment((current) => current.map((item) => item.id === record.id ? updated : item)); }}
          onDelete={() => { scrollTarget.current = null; setEquipment((current) => current.filter((item) => item.id !== record.id)); }} />
      </View>)}
      {inventory.missing.includes(id) && <Text style={styles.text}>Ajoutez au moins une fiche pour ce type.</Text>}
      <Pressable accessibilityRole="button" onPress={() => addEquipment(id)} style={styles.choice}>
        <Text style={styles.link}>+ Ajouter une fiche · {label}</Text>
      </Pressable>
    </View>)}
    {issues.length > 0 && <View accessibilityRole="alert" style={styles.help}>
      <Text style={styles.sectionTitle}>Points à corriger</Text>
      {issues.map((problem, index) => <Pressable key={`${problem.recordId ?? problem.type}-${problem.field}-${index}`}
        accessibilityRole="button" onPress={() => revealProblem(problem)} style={styles.back}>
        <Text style={styles.error}>{ISSUE_LABELS[problem.kind]} · {problem.name} · {problem.label} : {problem.message}</Text>
      </Pressable>)}
    </View>}
    {!snapshot && <Text style={styles.note}>Une estimation gratuite conservée. Actualisations et simulations personnelles : Premium.</Text>}
    <View style={styles.help}>
      <Text style={styles.note}>Estimation indicative basée sur vos appareils.{equipment.some(record => selected.includes(record.type) && record.quick) ? ' Profils provisoires utilisés.' : ''}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: assumptionsOpen }} aria-expanded={assumptionsOpen} onPress={() => setAssumptionsOpen(!assumptionsOpen)} style={styles.back}><Text style={styles.link}>Consulter les hypothèses {assumptionsOpen ? '⌃' : '⌄'}</Text></Pressable>
      {assumptionsOpen && equipment.filter(record => selected.includes(record.type)).map(record => {
        const profile = record.quick && findProfile(record.quick.profileId);
        return <View key={record.id} style={{ gap: 6 }}>
          <Text style={styles.sectionTitle}>{record.name}{profile ? ' · ' + profile.label : ' · Réglages personnalisés'}</Text>
          {usedSettings(record).map(setting => <Text key={setting.field} style={styles.text}>{setting.label} : {setting.value} · {ORIGIN_LABELS[setting.origin]}</Text>)}
          {profile && <Text style={styles.note}>Provenance : {profile.provenance} Profil provisoire, non validé.</Text>}
          <Text style={styles.note}>{record.quick?.state === 'proposed' ? 'À confirmer avec votre estimation.' : 'Valeurs actuelles utilisées pour le calcul.'}</Text>
        </View>;
      })}
      <Text style={styles.note}>Il s’agit d’une estimation, pas d’une mesure du compteur. Vos valeurs personnalisées sont conservées.</Text>
    </View>
    <Text style={styles.note}>« Voir mon estimation » valide les usages et profils estimatifs présentés.</Text>
    <Pressable accessibilityRole="button" onPress={showEstimate} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>Voir mon estimation</Text>
    </Pressable>
  </EquipmentStep>;
}
export default withSetupAccess(ConfigurationAppareilsScreen);
