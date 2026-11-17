import { HomeHeader, BalanceHero, HomeEquipment } from '@/components/home-summary';
import { useState } from 'react';
import { router } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Action, Bar, DashboardPage, ui } from '@/components/dashboard-ui';
import { useSetupDraft } from '@/components/setup-draft';
import { formatEstimate } from '@/utils/consumption';
import { autonomyLabel, formatReadingDate, formatShare } from '@/utils/dashboard';
import { estimateConfiguredInventory, ORIGIN_LABELS, usedSettings } from '@/utils/quick-equipment';
import { findProfile } from '@/utils/equipment-profiles';
import { readAppliances, readBalance, type SetupParams } from '@/utils/setup-params';

export default function TableauDeBordScreen() {
  const params = useDraftParams<SetupParams>();
  const { equipment } = useSetupDraft();
  const [all, setAll] = useState(false);
  const [details, setDetails] = useState<string[]>([]);
  const [explanation, setExplanation] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const inventory = estimateConfiguredInventory(equipment, readAppliances(params.appliances));
  const balance = readBalance(params);
  const entries = [...inventory.entries].sort((a, b) => (b.daily ?? -1) - (a.daily ?? -1));
  return <DashboardPage>

    <HomeHeader />
    <BalanceHero duration={autonomyLabel(balance.kWh, inventory.total)} kWh={balance.kWh} date={balance.validatedAt} />
    <View style={{ flexDirection: width < 370 || fontScale > 1.15 ? 'column' : 'row', gap: 12 }}>
      <View style={[ui.card, { flex: 1 }]}><Text style={ui.note}>Consommation estimée</Text><Text style={ui.number}>{inventory.total === null ? '—' : formatEstimate(inventory.total)}</Text><Text style={ui.note}>kWh/jour</Text></View>

    </View>
    <Action label="Mettre à jour mon solde" onPress={() => router.push('/nouveau-solde')} />
    <Action label="Simuler des économies" secondary onPress={() => router.push({ pathname: '/economies', params })} />
    <HomeEquipment />
    <View style={ui.card}><Text accessibilityRole="header" style={ui.heading}>Répartition estimée</Text>
      {inventory.total === null && <Text style={ui.text}>Inventaire incomplet : complétez vos appareils pour calculer le total et les parts.</Text>}
      {entries.length === 0 && <Text style={ui.text}>Ajoutez vos appareils pour estimer votre consommation.</Text>}
      {(all ? entries : entries.slice(0, 3)).map(({ record, daily }) => {
        const expanded = details.includes(record.id);
        const share = formatShare(daily, inventory.total);
        return <View key={record.id} style={ui.row}><Pressable accessibilityRole="button" accessibilityLabel={`${record.name}, ${expanded ? 'réduire' : 'détails'}`} accessibilityState={{ expanded }} aria-expanded={expanded} style={{ minHeight: 44, minWidth: 44, gap: 6 }} onPress={() => setDetails((ids) => expanded ? ids.filter((id) => id !== record.id) : [...ids, record.id])}>
          <View style={ui.header}><Text style={[ui.heading, { flexShrink: 1 }]}>{record.name}</Text><View style={local.details}><Text style={ui.link}>{expanded ? 'Réduire' : 'Détails'}</Text><Text accessible={false} style={ui.link}>{expanded ? '⌃' : '⌄'}</Text></View></View>
          <Text style={ui.note}>Quantité : {record.quantity} · {daily === null ? 'À compléter' : `${formatEstimate(daily)} kWh/jour`}</Text><Text style={ui.note}>{share}</Text>
          <Bar value={daily} total={inventory.total} label={`${record.name} : ${share}`} />
        </Pressable>{expanded && <View style={{ gap: 6 }}>{usedSettings(record).map((item) => <Text key={item.field} style={ui.note}>{item.label} : {item.value} · {ORIGIN_LABELS[item.origin]}</Text>)}
          {record.quick && <Text style={ui.note}>Profil provisoire : {findProfile(record.quick.profileId)?.label}. Provenance : {findProfile(record.quick.profileId)?.provenance}</Text>}</View>}</View>;
      })}
      {entries.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: all }} onPress={() => setAll(!all)} style={ui.touch}><Text style={ui.link}>{all ? 'Voir moins' : `Voir tous (${entries.length})`}</Text></Pressable>}
    </View>
    <View style={{ gap: 4 }}><Text style={ui.note}>Estimation indicative basée sur vos appareils.{inventory.estimated.length > 0 ? ' Profils provisoires utilisés.' : ''}</Text>
      <Pressable accessibilityRole="button" aria-expanded={explanation} accessibilityState={{ expanded: explanation }} onPress={() => setExplanation(!explanation)} style={[ui.touch, { alignSelf: 'flex-start' }]}><Text style={ui.link}>Comprendre le calcul {explanation ? '−' : '+'}</Text></Pressable>
      {explanation && <View style={ui.card}><Text style={ui.text}>Solde utilisé : {balance.kWh === null ? 'inconnu' : `${formatEstimate(balance.kWh)} kWh`}. Relevé : {balance.validatedAt ? formatReadingDate(balance.validatedAt) : 'non renseigné'}.</Text><Text style={ui.text}>Il s’agit d’une estimation, pas d’une mesure du compteur ni d’un compte à rebours. Le solde n’est pas actualisé automatiquement. Un inventaire incomplet peut surestimer l’autonomie.</Text>
        <Text style={ui.text}>Puissance : quantité × W / 1 000 × heures/jour × jours/semaine / 7 × temps actif. Cycles : quantité × kWh/cycle × cycles/semaine / 7. Consommation connue : quantité × kWh/jour, ou kWh/an / 365. Autonomie : solde / consommation quotidienne.</Text>
        <Text style={ui.text}>Les usages et caractéristiques réels peuvent varier. Les profils provisoires du prototype ne sont pas des références de marché validées ; leur précision n’est pas démontrée. Les réglages et leur provenance sont accessibles en développant chaque appareil.</Text>
        <Text style={ui.note}>Données enregistrées localement sur cet appareil, sans synchronisation.</Text></View>}
    </View>

    {__DEV__ && <View style={{ gap: 8 }}><Text style={ui.note}>Premium de test · Développement · Sans achat</Text><Action label="Gérer Premium de test" secondary onPress={() => router.push('/premium')} /></View>}
    <Action label="Mes scénarios" secondary onPress={() => router.push('/scenarios')} />
    <Action label="Modifier mes appareils" onPress={() => router.push({ pathname: '/configuration-appareils', params: { ...params, fromDashboard: 'true' } })} secondary />
  </DashboardPage>;
}
const local = StyleSheet.create({
  details: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hero: { backgroundColor: '#142142', borderRadius: 24, padding: 24, gap: 14 },
  heroLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  duration: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroNote: { color: '#D1DAEC', fontSize: 13, lineHeight: 20 },
});
