import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { ComingFeatures, OfferFeature, OfferPrice, OfferQuestions } from '@/components/offer-details';

export default function PremiumScreen() {
  const { setup, snapshot, access, setTestPremium } = useSetupDraft();
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [developmentOpen, setDevelopmentOpen] = useState(false);
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: snapshot ? '/tableau-de-bord' : '/', params: setup });
  }
  return <DashboardPage>
    <Action label="‹ Retour" secondary onPress={back} />
    <Text accessibilityRole="header" style={ui.title}>Abonnement</Text>
    <OfferPrice />
    <View style={ui.card}><Text accessibilityRole="header" style={ui.heading}>Trois outils pour votre foyer</Text>
      <View><OfferFeature icon="refresh" title="Actualiser votre estimation" />
      <OfferFeature icon="devices" title="Voir la consommation par appareil" />
      <OfferFeature icon="simulate" title="Simuler et enregistrer vos changements d’usage" /></View>
    </View>
    <Action label="Revenir à mon estimation" onPress={back} />
    <ComingFeatures />
    <Text style={ui.note}>Les simulations restent indicatives, sans économie garantie.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: questionsOpen }} aria-expanded={questionsOpen} style={ui.touch} onPress={() => setQuestionsOpen(!questionsOpen)}><Text style={ui.link}>Questions sur l’offre {questionsOpen ? '⌃' : '⌄'}</Text></Pressable>
    {questionsOpen && <OfferQuestions />}
    {__DEV__ && <View style={{ gap: 8 }}><Pressable accessibilityRole="button" accessibilityState={{ expanded: developmentOpen }} aria-expanded={developmentOpen} style={ui.touch} onPress={() => setDevelopmentOpen(!developmentOpen)}><Text style={ui.link}>{access.premium ? 'Premium de test actif · Gérer' : 'Mode de test · Développement'} {developmentOpen ? '⌃' : '⌄'}</Text></Pressable>{developmentOpen && <View style={ui.card}><Text style={ui.heading}>Développement uniquement</Text><Text style={ui.note}>Accès de test temporaire, sans achat. Les droits réels ne sont pas encore validés par un paiement.</Text><Action label={access.premium ? 'Désactiver Premium de test' : 'Activer Premium de test'} onPress={() => setTestPremium(!access.premium)} />{access.premium && <><Text style={ui.text}>Premium de test actif</Text><Action label="Ouvrir mon tableau de bord de test" onPress={() => router.replace({ pathname: '/tableau-de-bord', params: setup })} /></>}</View>}</View>}
    <Text style={ui.note}>Vos données sont conservées sur cet appareil, sans synchronisation et sans inscription obligatoire.</Text>
  </DashboardPage>;
}
