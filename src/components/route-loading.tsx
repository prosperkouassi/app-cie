import { ActivityIndicator, Text, View } from 'react-native';
import { DashboardPage, ui } from './dashboard-ui';

// Expo Router owns this boundary: it disappears when the suspended operation
// settles. No timer, no bypass of household restoration and no draft writes.
export function RouteLoading() {
  return <DashboardPage showIntroductionLink={false}>
    <Text style={ui.heading}>app-CIE</Text>
    <View style={ui.card}>
      <ActivityIndicator color="#4E8425" accessibilityLabel="Chargement de l’écran" />
      <Text accessibilityRole="header" style={ui.heading}>Un instant…</Text>
      <Text accessibilityLiveRegion="polite" style={ui.text}>Votre écran se prépare. Vos saisies sont conservées.</Text>
    </View>
  </DashboardPage>;
}
