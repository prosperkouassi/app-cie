import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSetupDraft } from './setup-draft';
import { design } from '@/constants/design';
import { Image } from 'expo-image';

const destinations = [
  { path: '/tableau-de-bord', label: 'Accueil', icon: require('../../assets/icons/tab-home.svg') },
  { path: '/economies', label: 'Simulation', icon: require('../../assets/icons/tab-simulation.svg') },
  { path: '/mon-solde', label: 'Mon solde', icon: require('../../assets/icons/tab-balance.svg') },
  { path: '/reglages', label: 'Réglages', icon: require('../../assets/icons/tab-settings.svg') },
] as const;
export function MainNavigation() {
  const path = usePathname();
  const { ready, access } = useSetupDraft();
  const insets = useSafeAreaInsets();
  if (!destinations.some(d => d.path === path)) return null;
  return <View accessibilityRole="tablist" style={{ backgroundColor: design.color.card, borderTopWidth: 1, borderColor: design.color.border, paddingBottom: insets.bottom, flexDirection: 'row' }}>
    {destinations.map(d => <Pressable key={d.path} accessibilityRole="tab" aria-selected={path === d.path} accessibilityState={{ selected: path === d.path, disabled: !ready }} disabled={!ready} onPress={() => router.navigate(d.path === '/economies' && !access.premium ? '/premium' : d.path)} style={{ flex: 1, minWidth: 0, minHeight: 66, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Image accessible={false} source={d.icon} tintColor={path === d.path ? design.color.green : design.color.ink} style={{ width: 26, height: 26 }} />
      <Text style={{ fontSize: 12, color: path === d.path ? design.color.green : design.color.ink, fontWeight: path === d.path ? '700' : '400', textAlign: 'center' }}>{d.label}</Text>
    </Pressable>)}
  </View>;
}
