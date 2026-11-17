import { useRef, useState } from 'react';
import { router, usePreventRemove } from 'expo-router';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { canUpdateBalance } from '@/utils/access';
import { readingClock } from '@/utils/balance-reading';
import PremiumScreen from './premium';

export default function NouveauSoldeScreen() {
  const { access, ready } = useSetupDraft();
  if (!ready) return null;
  return canUpdateBalance(access) ? <ReadingForm /> : <PremiumScreen />;
}

function ReadingForm() {
  const { setup, updateBalance } = useSetupDraft();
  const [input, setInput] = useState('');
  const [clock] = useState(() => readingClock());
  const [date, setDate] = useState(clock.date);
  const [time, setTime] = useState(clock.time);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const disablePrevention = usePreventRemove(busy);
  function cancel() {
    if (pending.current) return;
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/tableau-de-bord', params: setup });
  }
  async function save() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const params = await updateBalance({ balance: input, date, time });
      setBusy(false); disablePrevention();
      router.dismissTo({ pathname: '/tableau-de-bord', params });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enregistrement impossible. Réessayez.');
    } finally { pending.current = false; setBusy(false); }
  }
  return <DashboardPage showIntroductionLink={false}>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={cancel} style={ui.touch}><Text style={ui.link}>‹ Annuler</Text></Pressable>
    <Text accessibilityRole="header" style={ui.title}>Nouveau solde</Text>
    <Text style={ui.text}>Après une recharge, saisissez le solde total affiché sur votre compteur.</Text>
    <View style={ui.card}>
      <Text style={ui.heading}>Solde actuel (kWh)</Text>
      <TextInput accessibilityLabel="Solde actuel (kWh)" value={input} onChangeText={setInput} editable={!busy} keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={ui.input} placeholder="Ex. 32,5" />
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: help }} aria-expanded={help} onPress={() => setHelp(!help)} style={ui.touch}><Text style={ui.link}>Quel solde saisir ? {help ? '⌃' : '⌄'}</Text></Pressable>
      {help && <Text style={ui.note}>Saisissez le total affiché après recharge, pas seulement les kWh achetés.</Text>}
    </View>
    <View style={ui.card}>
      <Text style={ui.heading}>Date et heure du relevé</Text>
      <Text style={ui.note}>Modifiez-les si la lecture a été faite auparavant.</Text>
      <TextInput accessibilityLabel="Date du relevé (JJ/MM/AAAA)" value={date} onChangeText={setDate} editable={!busy} placeholder="JJ/MM/AAAA" keyboardType="numbers-and-punctuation" style={ui.input} />
      <TextInput accessibilityLabel="Heure du relevé (HH:mm)" value={time} onChangeText={setTime} editable={!busy} placeholder="HH:mm" keyboardType="numbers-and-punctuation" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={ui.input} />
    </View>
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.text}>{error}</Text>}
    {busy ? <Text accessibilityLiveRegion="polite" style={ui.text}>Enregistrement…</Text> : <Action label="Enregistrer et recalculer" onPress={save} />}
  </DashboardPage>;
}
