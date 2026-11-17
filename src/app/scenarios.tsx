import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { canManageScenarios } from '@/utils/access';
import { formatEstimate } from '@/utils/consumption';
import { formatReadingDate } from '@/utils/dashboard';
import { scenarioTotals } from '@/utils/saved-scenarios';
import PremiumScreen from './premium';

export default function ScenariosScreen() {
  const { access, ready, scenarios, storeScenario, deleteScenario } = useSetupDraft();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pending = useRef(false);
  if (!ready) return null;
  if (!canManageScenarios(access)) return <PremiumScreen />;
  async function change(operation: () => Promise<unknown>, success: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setMessage('');
    try { await operation(); setMessage(success); setFailed(false); setEditing(null); setConfirm(null); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Écriture impossible. Réessayez cette action.'); setFailed(true); }
    finally { pending.current = false; setBusy(false); }
  }
  return <DashboardPage>
    <Action label="‹ Retour au tableau de bord" secondary onPress={() => router.replace('/tableau-de-bord')} />
    <Text accessibilityRole="header" style={ui.title}>Mes scénarios</Text>
    <Text style={ui.note}>Comparez vos usages. Aucune économie garantie.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: helpOpen }} aria-expanded={helpOpen} style={ui.touch} onPress={() => setHelpOpen(!helpOpen)}><Text style={ui.link}>À propos des sauvegardes {helpOpen ? '⌃' : '⌄'}</Text></Pressable>
    {helpOpen && <Text style={ui.note}>Chaque scénario conserve sa référence sur cet appareil, sans synchronisation. Votre foyer reste inchangé.</Text>}
    <Action label="Créer une simulation" onPress={() => router.push('/economies')} />
    {busy && <Text accessibilityLiveRegion="polite" style={ui.text}>Enregistrement…</Text>}
    {!!message && <Text accessibilityRole={failed ? 'alert' : undefined} accessibilityLiveRegion="polite" style={ui.text}>{message}{failed ? ' Vos données sont conservées. Réessayez avec le bouton de l’action.' : ''}</Text>}
    {scenarios.length === 0 && <View style={ui.card}><Text style={ui.heading}>Votre premier scénario vous attend</Text><Text style={ui.text}>Comparez vos usages, puis enregistrez une simulation pour la retrouver ici.</Text></View>}
    {[...scenarios].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).map(s => {
      const { simulated, comparison } = scenarioTotals(s);
      return <View key={s.id} style={ui.card}>
        <Text accessibilityRole="header" style={ui.heading}>{s.name}</Text>
        <Text style={ui.number}>{formatEstimate(simulated.total!)} kWh/jour</Text>
        <Text style={ui.text}>{comparison ? `${formatEstimate(Math.abs(comparison.month))} kWh ${comparison.difference > 0 ? 'de réduction' : comparison.difference < 0 ? 'de hausse' : 'de différence'} estimée sur 30 jours` : 'Comparaison indéterminée'}</Text>
        <Text style={ui.note}>Par rapport à la référence enregistrée. Modifié le {formatReadingDate(s.modifiedAt)}.</Text>
        <Action label={`Ouvrir et modifier · ${s.name}`} secondary onPress={() => { if (!pending.current) router.push({ pathname: '/economies', params: { scenarioId: s.id } }); }} />
        {editing === s.id ? <><TextInput accessibilityLabel={`Nouveau nom pour ${s.name}`} value={name} maxLength={60} editable={!busy} onChangeText={setName} style={ui.input} /><Action label="Confirmer le nom" secondary onPress={() => change(() => storeScenario({ ...s, name }, s.id), 'Nom enregistré.')} /><Action label="Annuler le renommage" secondary onPress={() => { if (!busy) setEditing(null); }} /></>
          : <Action label={`Renommer · ${s.name}`} secondary onPress={() => { if (!busy) { setEditing(s.id); setName(s.name); setConfirm(null); } }} />}
        {confirm === s.id ? <><Text accessibilityRole="alert" style={ui.text}>Supprimer « {s.name} » de cet appareil ? Cette action est définitive et ne modifie pas votre foyer.</Text><Action label="Confirmer la suppression" secondary onPress={() => change(() => deleteScenario(s.id), 'Scénario supprimé.')} /><Action label="Conserver ce scénario" secondary onPress={() => { if (!busy) setConfirm(null); }} /></>
          : <Action label={`Supprimer · ${s.name}`} secondary onPress={() => { if (!busy) { setConfirm(s.id); setEditing(null); } }} />}
      </View>;
    })}
  </DashboardPage>;
}
