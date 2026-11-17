import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Action, Bar, DashboardPage, ui } from './dashboard-ui';
import { createEquipment, estimateEquipment, formatEstimate } from '@/utils/consumption';
import { compareConsumption } from '@/utils/dashboard';
export function Illustration() {
  const [hours, setHours] = useState(4);
  const appliance = { ...createEquipment('illustration-only', 'fan'), name: 'Ventilateur fictif', quantity: '1', mode: 'power' as const, watts: '45', hours: '8', days: '7', intermittent: false };
  const current = estimateEquipment(appliance).daily!;
  const scenario = estimateEquipment({ ...appliance, hours: String(hours) }).daily!;
  const comparison = compareConsumption(current, scenario)!;
  return <DashboardPage><Action label="‹ Retour à la découverte" secondary onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
    <Text style={ui.note}>EXEMPLE ILLUSTRATIF · DONNÉES FICTIVES</Text><Text style={ui.title}>Et si vous changiez un usage ?</Text><Text style={ui.text}>Cet exemple n’utilise aucun appareil ni relevé de votre foyer. Il ne prédit pas vos économies.</Text>
    <View style={ui.card}><Text style={ui.heading}>Ventilateur fictif · 45 W</Text><Text style={ui.text}>Exemple : 8 heures/jour, 7 jours/semaine.</Text><Text style={ui.text}>Scénario : {hours} heures/jour</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[2, 4, 8, 12].map((h) => <Pressable key={h} accessibilityRole="button" accessibilityState={{ selected: hours === h }} style={[ui.input, { minWidth: 44 }]} onPress={() => setHours(h)}><Text style={ui.text}>{hours === h ? '✓ ' : ''}{h} h</Text></Pressable>)}</View>
      {([['Actuel', current], ['Scénario', scenario]] as const).map(([label, value]) => <View key={label} style={{ gap: 8 }}><Text style={ui.text}>{label} : {formatEstimate(value)} kWh/jour</Text><Bar value={value} total={Math.max(current, scenario)} label={`${label} : ${formatEstimate(value)} kWh/jour`} /></View>)}
      <Text style={ui.number}>{formatEstimate(Math.abs(comparison.month))} kWh</Text><Text style={ui.text}>{comparison.difference < 0 ? 'supplémentaires' : comparison.difference > 0 ? 'économisés' : 'de différence'} sur 30 jours dans cet exemple.</Text>
    </View><Action label="Simuler avec mes appareils · Découvrir Premium" onPress={() => router.push('/premium')} />
  </DashboardPage>;
}
