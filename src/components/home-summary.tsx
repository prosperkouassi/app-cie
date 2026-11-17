import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ui, Action } from './dashboard-ui';
import { EquipmentIcon } from './equipment-icon';
import { useSetupDraft } from './setup-draft';
import { scalar } from '@/utils/setup-params';
import { formatEstimate } from '@/utils/consumption';
import { formatReadingDate } from '@/utils/dashboard';
import { design } from '@/constants/design';

export function HomeHeader() {
  const { setup } = useSetupDraft();
  return <View style={ui.header}><View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={ui.title}>{scalar(setup.firstName).trim() ? `Bonjour ${scalar(setup.firstName).trim()}` : 'Bienvenue'}</Text><Text style={ui.text}>Votre énergie en un coup d’œil.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les réglages du profil" onPress={() => router.navigate('/reglages')} style={{ minWidth: 52, minHeight: 52, borderRadius: 26, backgroundColor: '#EDF5E7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 25 }}>{scalar(setup.avatar) || '◉'}</Text></Pressable></View>;
}
export function BalanceHero({ duration, kWh, date }: { duration: string; kWh: number | null; date: string | null }) {
  const { width, fontScale } = useWindowDimensions();
  const shortDuration = duration.replace(/ jours?/g, ' j').replace(/ heures?/g, ' h').replace(' et ', ' ');
  return <LinearGradient colors={design.color.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: design.space.page, borderRadius: design.radius.card, gap: 14 }}>
    <View style={{ flexDirection: width < 350 || fontScale > 1.2 ? 'column' : 'row', gap: 20 }}><View style={{ flex: 1, gap: 6 }}><Text style={{ color: 'white', fontSize: 15 }}>Autonomie estimée</Text><Text accessibilityLabel={duration} style={[ui.number, { color: 'white', fontSize: 25 }]}>{shortDuration}</Text></View><View style={{ flex: 1, gap: 6 }}><Text style={{ color: 'white', fontSize: 15 }}>Solde au relevé</Text><Text style={[ui.number, { color: 'white', fontSize: 25 }]}>{kWh === null ? 'Non renseigné' : `${formatEstimate(kWh)} kWh`}</Text></View></View>
    <Text style={{ color: 'white', fontSize: 13, lineHeight: 20 }}>{date ? `Relevé du ${formatReadingDate(date)}` : 'Aucun relevé renseigné'}</Text><Text style={{ color: 'white', fontSize: 13 }}>Estimation indicative</Text>
  </LinearGradient>;
}
export function HomeEquipment() {
  const { equipment, selected, access, setup } = useSetupDraft();
  const { width, fontScale } = useWindowDimensions();
  const records = equipment.filter(r => selected.includes(r.type));
  const manage = (id?: string) => router.push(access.premium ? { pathname: '/configuration-appareils', params: { ...setup, fromDashboard: 'true', equipmentId: id ?? '' } } : '/premium');
  return <View style={{ gap: 12 }}><View style={ui.header}><Text style={ui.heading}>Mes appareils</Text><Pressable accessibilityRole="button" onPress={() => manage()} style={ui.touch}><Text style={ui.link}>Gérer</Text></Pressable></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{records.slice(0, 6).map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Ouvrir la fiche ${r.name}`} onPress={() => manage(r.id)} style={[ui.card, { width: width < 350 || fontScale > 1.2 ? '47%' : '31%', padding: 10, alignItems: 'center', gap: 8 }]}><EquipmentIcon type={r.type} iconKey={r.iconKey} /><Text style={[ui.text, { textAlign: 'center', fontSize: 13 }]}>{r.name}</Text></Pressable>)}</View>
    {records.length > 6 && <Action label="Voir tous les appareils" secondary onPress={() => manage()} />}
  </View>;
}
