import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Action, ui } from './dashboard-ui';
import { useSetupDraft } from './setup-draft';
import type { ScenarioInput } from '@/utils/saved-scenarios';

export function ScenarioSave({ input, initialId, initialName }: { input: Omit<ScenarioInput, 'name'>; initialId?: string; initialName?: string }) {
  const { storeScenario } = useSetupDraft();
  const [open, setOpen] = useState(!!initialId);
  const [name, setName] = useState(initialName ?? 'Mes nouveaux usages');
  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const retryCopy = useRef(false);
  async function save(copy = false) {
    if (pending.current) return;
    pending.current = true; retryCopy.current = copy; setBusy(true); setMessage('');
    try {
      const saved = await storeScenario({ ...input, name }, copy ? undefined : id);
      setId(saved.id); setFailed(false); setMessage('Scénario enregistré sur cet appareil.');
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Écriture impossible. Vos réglages sont conservés ici.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <View style={ui.card}>
    {!open ? <Action label="Enregistrer le scénario" onPress={() => setOpen(true)} /> : <>
      <Text style={ui.heading}>Nom du scénario</Text>
      <TextInput accessibilityLabel="Nom du scénario" maxLength={60} value={name} onChangeText={setName} style={ui.input} returnKeyType="done" editable={!busy} />
      {busy ? <Text accessibilityLiveRegion="polite" style={ui.text}>Enregistrement…</Text> : <><Action label={id ? 'Mettre à jour' : 'Enregistrer le scénario'} onPress={() => save()} />
        {id && <Action label="Enregistrer une copie" secondary onPress={() => save(true)} />}
        {failed && <Action label="Réessayer l’enregistrement" secondary onPress={() => save(retryCopy.current)} />}</>}
      {!!message && <Text accessibilityRole={failed ? 'alert' : undefined} accessibilityLiveRegion="polite" style={ui.text}>{message}</Text>}
    </>}
    <Text style={ui.note}>Sauvegarde locale uniquement. Ce scénario ne modifie pas vos appareils ni vos habitudes de référence.</Text>
  </View>;
}
