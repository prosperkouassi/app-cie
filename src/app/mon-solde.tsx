import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { readBalance } from '@/utils/setup-params';
import { estimateConfiguredInventory } from '@/utils/quick-equipment';
import { autonomyLabel, formatReadingDate } from '@/utils/dashboard';
import { formatEstimate } from '@/utils/consumption';

export default function BalanceScreen() {
  const { setup, snapshot, equipment, selected, access } = useSetupDraft();
  const balance = readBalance(access.premium ? setup : snapshot?.params ?? {});
  const total = access.premium ? estimateConfiguredInventory(equipment, selected).total : snapshot?.total ?? null;
  return <DashboardPage>
    <View style={ui.header}><Text accessibilityRole="header" style={ui.title}>Mon solde</Text><Text style={ui.link}>{access.premium ? 'Premium' : 'Découverte'}</Text></View>
    {balance.kWh === null ? <View style={ui.card}><Text style={ui.heading}>Aucun relevé disponible</Text><Text style={ui.text}>Configurez votre foyer pour obtenir votre première estimation.</Text><Action label="Configurer mon foyer" onPress={() => router.push('/')} /></View> : <>
      <View style={ui.card}><Text style={ui.heading}>Dernier solde renseigné</Text><Text style={ui.number}>{formatEstimate(balance.kWh)} kWh</Text><Text style={ui.text}>{formatReadingDate(balance.validatedAt)}</Text></View>
      <View style={ui.card}><Text style={ui.heading}>Autonomie estimée au relevé</Text><Text style={ui.number}>{autonomyLabel(balance.kWh, total)}</Text><Text style={ui.note}>Estimation indicative · Le solde n’est pas actualisé en temps réel.</Text></View>
    </>}
    {!access.premium && snapshot && <Text style={ui.note}>Données de votre première estimation gratuite, conservées sans actualisation.</Text>}
    <Action label="Mettre à jour mon solde" onPress={() => router.push(access.premium ? '/nouveau-solde' : '/premium')} />
  </DashboardPage>;
}
