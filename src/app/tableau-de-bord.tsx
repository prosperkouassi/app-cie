import { HomeHeader, BalanceHero, HomeEquipment } from '@/components/home-summary';
import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import PersonalDashboard from '@/components/personal-dashboard';
import { useSetupDraft } from '@/components/setup-draft';
import { formatDuration, formatReadingDate } from '@/utils/dashboard';
import { formatEstimate } from '@/utils/consumption';
import { readBalance } from '@/utils/setup-params';
import { OfferFeature } from '@/components/offer-details';

export default function TableauDeBordScreen() {
  const { snapshot, access } = useSetupDraft();
  const [explain, setExplain] = useState(false);
  if (!snapshot) return <DashboardPage><HomeHeader /><Text style={ui.title}>Configurez votre foyer</Text><Text style={ui.text}>Reprenez votre configuration pour obtenir votre première estimation.</Text><Action label="Configurer mon foyer" onPress={() => router.push('/')} /></DashboardPage>;
  if (access.premium) return <PersonalDashboard />;
  const balance = readBalance(snapshot.params);
  const premium = () => router.push('/premium');
  return <DashboardPage>
    <HomeHeader />
    <BalanceHero duration={balance.kWh === null ? 'Solde inconnu' : balance.kWh === 0 ? 'Crédit épuisé' : formatDuration(snapshot.autonomy)} kWh={balance.kWh} date={balance.validatedAt} />
    <View style={ui.card}><Text style={ui.note}>Consommation estimée</Text><Text style={ui.number}>{formatEstimate(snapshot.total)} kWh/jour</Text><Text style={ui.note}>Instantané de votre première estimation, sans actualisation automatique.</Text></View>
    <Action label="Mettre à jour mon solde" onPress={premium} />
    <Action label="Simuler des économies" secondary onPress={premium} />
    <HomeEquipment />
    <View style={ui.card}><Text style={ui.heading}>Répartition estimée</Text><Text style={ui.note}>Principal appareil · Première estimation</Text><Text style={ui.text}>{snapshot.primaryName || 'Non déterminé'}</Text><Action label="Voir tous · Premium" secondary onPress={premium} /></View>
    
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: explain }} aria-expanded={explain} style={ui.touch} onPress={() => setExplain(!explain)}><Text style={ui.link}>Comprendre le calcul {explain ? '⌃' : '⌄'}</Text></Pressable>
    {explain && <View style={ui.card}><Text style={ui.text}>Solde utilisé : {balance.kWh === null ? 'inconnu' : `${formatEstimate(balance.kWh)} kWh`}. Relevé : {balance.validatedAt ? formatReadingDate(balance.validatedAt) : 'non renseigné'}.</Text><Text style={ui.text}>Ce résultat estime les usages, sans mesurer le compteur ni suivre le solde en temps réel. Un inventaire incomplet peut surestimer l’autonomie.</Text><Text style={ui.text}>Les profils provisoires sont des hypothèses internes de prototype, sans mesure ni référence fabricant vérifiée. Leur précision n’est pas démontrée.</Text><Text style={ui.text}>Puissance × heures × jours/semaine / 7 × quantité et coefficient actif ; ou kWh/cycle × cycles/semaine / 7 × quantité ; ou kWh/jour × quantité ; ou kWh/an / 365 × quantité. Autonomie = solde / consommation quotidienne. Les réglages et provenances d’origine sont conservés localement.</Text></View>}
    <View style={ui.card}><Text style={ui.heading}>Aller plus loin avec Premium</Text><Text style={ui.note}>2 000 FCFA/an · Abonnement bientôt disponible</Text>
      <View>
        <OfferFeature icon="refresh" title="Mettre à jour mon solde" accessibilityLabel="Mettre à jour mon solde · Premium" onPress={premium} />
        <OfferFeature icon="devices" title="Répartition complète" accessibilityLabel="Répartition complète · Premium" onPress={premium} />
        <OfferFeature icon="simulate" title="Simuler avec mes appareils" accessibilityLabel="Simuler avec mes appareils · Premium" onPress={premium} />
      </View>
      <Action label="Découvrir Premium" onPress={premium} />
    </View>
    <Action label="Exemple fictif" secondary onPress={() => router.push('/exemple-fictif')} />
    <Text style={ui.note}>Données sauvegardées localement sur cet appareil, sans synchronisation.</Text>
  </DashboardPage>;
}
