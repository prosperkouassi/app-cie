import { useState } from 'react';
import { router } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { withSetupAccess } from '@/components/access-gate';
import { useSetupDraft } from '@/components/setup-draft';
import { Text, TextInput, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { householdParams, type SetupParams } from '@/utils/setup-params';

function InformationsFoyerScreen() {
  const params = useDraftParams<SetupParams & { section?: string }>();
  const { setup, setSetup } = useSetupDraft();
  const household = householdParams(params);
  const [name, setName] = useState(household.homeName);
  const [commune, setCommune] = useState(household.commune);
  function save() {
    const next = { ...params, ...setup, homeName: name.trim() || 'Ma maison', commune: commune.trim() };
    setSetup(current => ({ ...current, homeName: next.homeName, commune: next.commune }));
    router.dismissTo({ pathname: '/tableau-de-bord', params: next });
  }
  return <DashboardPage showIntroductionLink={false}><Action label="‹ Annuler" secondary onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/tableau-de-bord', params })} />
    <Text style={ui.title}>Informations du foyer</Text>
    <View style={ui.card}><Text style={ui.heading}>Nom du foyer</Text><TextInput accessibilityLabel="Nom du foyer" value={name} onChangeText={setName} style={ui.input} /><Text style={ui.heading}>Commune</Text><TextInput accessibilityLabel="Commune" value={commune} onChangeText={setCommune} style={ui.input} /></View>
    <Action label="Mettre à jour mon solde" secondary onPress={() => router.push('/nouveau-solde')} />
    <Action label="Enregistrer les informations" onPress={save} />
  </DashboardPage>;
}
export default withSetupAccess(InformationsFoyerScreen);
