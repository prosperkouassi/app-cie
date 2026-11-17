import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { scalar } from '@/utils/setup-params';

export default function SettingsScreen() {
  const { setup, updateProfile } = useSetupDraft();
  return <DashboardPage>
    <Text accessibilityRole="header" style={ui.title}>Réglages</Text>
    <View style={ui.card}><Text style={ui.heading}>Votre profil local</Text><Text style={ui.note}>Facultatif, sans compte ni inscription.</Text><Text style={ui.text}>Prénom</Text>
      <TextInput accessibilityLabel="Prénom, facultatif" maxLength={40} autoComplete="given-name" style={ui.input} value={scalar(setup.firstName)} onChangeText={firstName => updateProfile({ firstName })} />
      <Text style={ui.text}>Avatar</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['◉', '🌿', '☀', '🏡'].map(avatar => <Pressable key={avatar} accessibilityRole="button" accessibilityLabel={`Choisir l’avatar ${avatar}`} accessibilityState={{ selected: (scalar(setup.avatar) || '◉') === avatar }} onPress={() => updateProfile({ avatar })} style={[ui.input, { minWidth: 52, alignItems: 'center', borderColor: setup.avatar === avatar ? '#4E8425' : '#DFE6E5' }]}><Text style={ui.heading}>{avatar}</Text></Pressable>)}</View>
    </View>
    <Action label="Abonnement" onPress={() => router.push('/premium')} />
    <Action label="Revoir la présentation" secondary onPress={() => router.push({ pathname: '/bienvenue', params: { mode: 'replay' } })} />
    <View style={ui.card}><Text style={ui.heading}>Sauvegarde locale</Text><Text style={ui.text}>Votre foyer, vos relevés et vos scénarios sont conservés sur cet appareil. Ils ne sont pas synchronisés avec un compte.</Text></View>
    <Action label="Exemple fictif" secondary onPress={() => router.push('/exemple-fictif')} />
  </DashboardPage>;
}
