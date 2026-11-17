import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScenarioSave } from '@/components/scenario-save';
import { EquipmentIcon } from '@/components/equipment-icon';
import { LinearGradient } from 'expo-linear-gradient';
import { design } from '@/constants/design';
import { householdChanged } from '@/utils/saved-scenarios';
import { useDraftParams } from '@/hooks/use-draft-params';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Action, Bar, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { formatEstimate } from '@/utils/consumption';
import { canUsePersonalSimulation } from '@/utils/access';
import { autonomyLabel, changeScenario, cloneScenario, compareConsumption, formatReadingDate, scenarioField } from '@/utils/dashboard';
import { editEquipment, estimateConfiguredInventory } from '@/utils/quick-equipment';
import { parseKWh, readAppliances, readBalance, type SetupParams } from '@/utils/setup-params';

function PersonalEconomiesScreen() {
  const params = useDraftParams<SetupParams>();
  const { equipment, scenarios } = useSetupDraft();
  const { scenarioId } = useLocalSearchParams<{ scenarioId?: string }>();
  const [saved] = useState(() => scenarios.find(s => s.id === scenarioId));
  const [selected] = useState(() => saved ? [...saved.selected] : readAppliances(params.appliances));
  const [reading] = useState(() => ({ ...(saved?.reading ?? params) }));
  const [reference] = useState(() => cloneScenario(saved?.reference ?? equipment.filter(r => selected.includes(r.type))));
  const [scenario, setScenario] = useState(() => cloneScenario(saved?.simulated ?? reference));
  const [custom, setCustom] = useState<string[]>([]);
  const [adjusting, setAdjusting] = useState(() => reference.filter(r => scenarioField(r)).map(r => r.id));
  const [chooser, setChooser] = useState(false);
  const current = estimateConfiguredInventory(reference, selected);
  const simulated = estimateConfiguredInventory(scenario, selected);
  const comparison = compareConsumption(current.total, simulated.total);
  const balance = readBalance(reading);
  const maximum = Math.max(current.total ?? 0, simulated.total ?? 0);
  function update(id: string, value: string) { setScenario((records) => records.map((record) => record.id === id ? changeScenario(record, value) : record)); }
  return <DashboardPage>
    {__DEV__ && <Text style={ui.note}>PREMIUM DE TEST · DÉVELOPPEMENT · SANS ACHAT</Text>}
    <Action label="‹ Retour au tableau de bord" secondary onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/tableau-de-bord', params })} />
    <View style={ui.header}><Text accessibilityRole="header" style={ui.title}>Simulation</Text><Text style={[ui.heading, { color: design.color.green }]}>Premium</Text></View>
    <Text style={ui.note}>Comparez vos usages, sans modifier votre foyer.</Text>
    <View style={[ui.card, { backgroundColor: '#EDF5E7' }]}><Text style={ui.text}>Référence : {saved ? 'usages enregistrés avec ce scénario' : 'mes usages enregistrés'}</Text></View>
    {saved && <Text style={ui.heading}>{saved.name}</Text>}
    {scenarioId && !saved && <Text accessibilityRole="alert" style={ui.text}>Scénario introuvable. Vous pouvez créer une nouvelle simulation à partir du foyer.</Text>}
    {saved && householdChanged(saved, equipment, readAppliances(params.appliances)) && <Text accessibilityRole="alert" style={ui.text}>Votre foyer a changé depuis l’enregistrement. La comparaison conserve les appareils de référence enregistrés, sans les remplacer.</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: chooser }} onPress={() => setChooser(!chooser)} style={ui.touch}><Text style={ui.link}>Choisir les appareils à ajuster {chooser ? '−' : '+'}</Text></Pressable>
    {chooser && <View style={ui.card}>{reference.filter(r => selected.includes(r.type)).map(r => <Pressable key={r.id} accessibilityRole="checkbox" accessibilityState={{ checked: adjusting.includes(r.id) }} aria-checked={adjusting.includes(r.id)} onPress={() => {
      if (adjusting.includes(r.id)) {
        setScenario(records => records.map(record => record.id === r.id ? cloneScenario([r])[0] : record));
        setAdjusting(ids => ids.filter(id => id !== r.id));
      } else setAdjusting(ids => [...ids, r.id]);
    }} style={ui.touch}><Text style={ui.text}>{adjusting.includes(r.id) ? '✓ ' : '＋ '}{r.name}</Text></Pressable>)}<Text style={ui.note}>Retirer un appareil des réglages rétablit son usage de référence. Il reste inclus dans la comparaison du foyer.</Text></View>}
    {scenario.filter((record) => selected.includes(record.type) && adjusting.includes(record.id)).map((record) => {
      const field = scenarioField(record);
      const label = field === 'cycles' ? 'Cycles/semaine' : 'Heures/jour';
      const value = field ? parseKWh(record[field]) : null;
      const invalid = field && (value === null || (field === 'hours' && value > 24));
      const original = reference.find(r => r.id === record.id)!;
      return <View key={record.id} style={ui.card}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><EquipmentIcon type={record.type} iconKey={record.iconKey} size={44} /><View style={{ flex: 1 }}><Text style={ui.heading}>{record.name}</Text><Text style={ui.note}>Quantité : {record.quantity}</Text></View></View>
        {field && <Text style={ui.note}>Référence : {original[field]} {field === 'hours' ? 'h/jour' : 'cycles/semaine'}</Text>}
        {field ? <><Text style={ui.text}>{label} : {record[field] || 'À renseigner'}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(field === 'hours' ? [0, 2, 4, 8, 12] : [0, 1, 3, 7]).map((choice) => <Pressable key={choice} accessibilityRole="button" accessibilityLabel={`${record.name} : ${choice} ${label}`} accessibilityState={{ selected: value === choice }} onPress={() => update(record.id, String(choice))} style={[ui.input, { minWidth: 48, justifyContent: 'center', borderColor: value === choice ? '#4E8425' : '#A3AEC0' }]}><Text style={ui.text}>{value === choice ? '✓ ' : ''}{choice}</Text></Pressable>)}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: custom.includes(record.id) }} aria-expanded={custom.includes(record.id)} onPress={() => setCustom((ids) => ids.includes(record.id) ? ids.filter((id) => id !== record.id) : [...ids, record.id])} style={ui.touch}><Text style={ui.link}>Autres réglages</Text></Pressable></View>
          {custom.includes(record.id) && <View style={{ gap: 8 }}><Text style={ui.text}>{label} · valeur personnalisée</Text><TextInput accessibilityLabel={`${label} pour ${record.name}`} value={record[field]} onChangeText={(text) => update(record.id, text)} keyboardType="decimal-pad" style={ui.input} />
            {field === 'hours' && <><Text style={ui.text}>Jours par semaine · de 0 à 7</Text><TextInput accessibilityLabel={`Jours par semaine pour ${record.name}`} value={record.days} onChangeText={days => setScenario(records => records.map(r => r.id === record.id ? editEquipment(r, { days }) : r))} keyboardType="decimal-pad" style={ui.input} /></>}
          </View>}
          {!!invalid && <Text accessibilityRole="alert" style={ui.text}>{field === 'hours' ? 'Saisissez entre 0 et 24 heures par jour.' : 'Saisissez un nombre positif ou nul de cycles par semaine.'}</Text>}
        </> : <Text style={ui.note}>{record.type === 'fridge' || record.type === 'freezer' ? 'Fonctionnement conservé : ne coupez pas cet appareil pour économiser.' : 'Ce profil est exprimé en kWh/jour ou kWh/an. Une configuration adaptée est nécessaire pour simuler un changement d’heures.'}</Text>}
      </View>;
    })}
    <LinearGradient colors={design.color.impact} style={ui.card}><Text style={ui.heading}>Impact estimé</Text>
      {([[saved ? 'Référence enregistrée' : 'Référence', current.total], ['Scénario', simulated.total]] as const).map(([label, total], index) => <View key={label} style={{ gap: 8 }}><Text style={ui.text}>{label} · {total === null ? 'Indéterminé' : `${formatEstimate(total)} kWh/jour`}</Text><Bar value={total} total={maximum} color={index === 1 ? design.color.cyan : design.color.green} label={`${label} : ${total === null ? 'indéterminé' : `${formatEstimate(total)} kWh/jour`}`} /></View>)}
      {comparison && <Text style={ui.text}>{formatEstimate(Math.abs(comparison.difference))} kWh/jour {comparison.difference > 0 ? 'de moins' : comparison.difference < 0 ? 'de plus' : 'de différence'}</Text>}
      {comparison ? <><Text style={ui.number}>{formatEstimate(Math.abs(comparison.month))} kWh</Text><Text style={ui.text}>{comparison.difference > 0 ? 'économisés sur 30 jours' : comparison.difference < 0 ? 'supplémentaires sur 30 jours' : 'de différence sur 30 jours'}{comparison.percent !== null ? ` · ${formatEstimate(Math.abs(comparison.percent))} %${comparison.difference < 0 ? ' de hausse' : comparison.difference > 0 ? ' de réduction' : ''}` : ' · Pourcentage indéterminé (référence nulle)'}</Text></> : <Text accessibilityRole="alert" style={ui.text}>Complétez les réglages valides de tous les appareils pour comparer.</Text>}
    </LinearGradient>
    <View style={ui.card}>{balance.kWh !== null ? <><Text style={ui.heading}>Autonomie au même solde</Text><Text style={ui.note}>Relevé du {formatReadingDate(balance.validatedAt)} · {formatEstimate(balance.kWh)} kWh</Text><Text style={ui.text}>Référence : {autonomyLabel(balance.kWh, current.total)}</Text><Text style={ui.text}>Scénario : {autonomyLabel(balance.kWh, simulated.total)}</Text></> : <Text style={ui.note}>Solde inconnu : autonomie non comparée.</Text>}</View>
    <Text style={ui.note}>Estimation indicative basée sur vos appareils.{current.estimated.length > 0 ? ' Profils provisoires utilisés.' : ''} Les barres comparent des estimations, pas des mesures. Aucune économie garantie.</Text>
    <ScenarioSave input={{ reference, simulated: scenario, selected, reading }} initialId={saved?.id} initialName={saved?.name} />
    <Action label="Mes scénarios" secondary onPress={() => router.push('/scenarios')} />
    <Action label="Réinitialiser la simulation" secondary onPress={() => setScenario(cloneScenario(reference))} />
  </DashboardPage>;
}

export default function EconomiesScreen() {
  const { ready, access, snapshot, equipment } = useSetupDraft();
  if (!ready) return null;
  if (!canUsePersonalSimulation(access)) return <Redirect href="/premium" />;
  if (!snapshot && equipment.length === 0) return <DashboardPage><Text style={ui.title}>Configurez votre foyer</Text><Text style={ui.text}>Ajoutez vos appareils avant de comparer vos usages.</Text><Action label="Configurer mon foyer" onPress={() => router.push('/')} /></DashboardPage>;
  return <PersonalEconomiesScreen />;
}
