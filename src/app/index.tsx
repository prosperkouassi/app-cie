import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import type { Href } from 'expo-router';
import { useIntroduction } from '@/components/introduction-provider';
import { hasStartedJourney, shouldIntroduce } from '@/utils/introduction';

export default function HomeScreen() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const draft = useSetupDraft();
  const { setup, setSetup, snapshot, resumeRoute } = draft;
  const introduction = useIntroduction();
  const [started, setStarted] = useState(start === 'true' || Object.keys(setup).length > 0);
  const [initialRoute] = useState(resumeRoute);
  if (shouldIntroduce(draft.ready && introduction.ready, introduction.seen, hasStartedJourney(draft))) return <Redirect href="/bienvenue" />;
  if (snapshot) return <Redirect href="/tableau-de-bord" />;
  if (initialRoute !== '/') return <Redirect href={{ pathname: initialRoute, params: setup } as Href} />;
  if (started) return <DashboardPage showIntroductionLink={false}>
    <Action label="‹ Retour à l’accueil" secondary onPress={() => setStarted(false)} />
    <Text style={ui.note}>ÉTAPE 1 SUR 5 · VOTRE FOYER</Text><Text style={ui.title}>Parlons de votre maison</Text>
    <Text style={ui.text}>Nommez votre foyer, ou continuez directement.</Text>
    <View style={ui.card}><Text style={ui.heading}>Nom du foyer · facultatif</Text><TextInput accessibilityLabel="Nom du foyer, facultatif" style={ui.input} value={typeof setup.homeName === 'string' ? setup.homeName : ''} onChangeText={(homeName) => setSetup((s) => ({ ...s, homeName }))} placeholder="Ma maison" /><Text style={ui.heading}>Commune · facultatif</Text><TextInput accessibilityLabel="Commune" style={ui.input} value={typeof setup.commune === 'string' ? setup.commune : ''} onChangeText={(commune) => setSetup((s) => ({ ...s, commune }))} placeholder="Ex. Grand-Bassam" /></View>
    <Action label="Continuer" onPress={() => router.push({ pathname: '/abonnement', params: setup })} />
  </DashboardPage>;
  return <DashboardPage>
    <Text style={ui.heading}>app-CIE</Text>
    <Text accessibilityRole="header" style={ui.title}>Comprenez votre consommation.</Text><Text style={ui.text}>Découvrez comment faire durer votre crédit.</Text>
    <View style={ui.card}><Text style={ui.heading}>Première estimation gratuite</Text><Text style={ui.text}>Votre consommation quotidienne et votre autonomie au moment du relevé.</Text><Text style={ui.note}>Saisies modifiables avant validation. Résultat gratuit conservé.</Text></View>
    <Action label="Faire ma première estimation" onPress={() => setStarted(true)} />
    <Text style={ui.note}>Sans inscription · Sauvegarde locale sur cet appareil</Text>
    <View style={ui.card}><View style={ui.header}><Text style={ui.heading}>Premium</Text><Text style={[ui.text, { fontWeight: '700' }]}>2 000 FCFA/an</Text></View><Text style={ui.note}>Actualisations, répartition complète et simulations avec vos appareils.</Text><Action label="Découvrir Premium" secondary onPress={() => router.push('/premium')} /><Text style={ui.note}>Abonnement bientôt disponible. Historique et rappels : à venir.</Text></View>
  </DashboardPage>;
}
