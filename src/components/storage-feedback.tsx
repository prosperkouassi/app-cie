import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, DashboardPage, ui } from './dashboard-ui';

export function RestorationScreen({ error, retry, introduction = false }: { error?: string | null; retry?: () => void; introduction?: boolean }) {
  return <DashboardPage showIntroductionLink={false}>
    <Text style={ui.heading}>app-CIE</Text>
    <View style={ui.card}>
      {!error && <ActivityIndicator color="#4E8425" accessibilityLabel="Chargement des données locales" />}
      <Text accessibilityRole="header" style={ui.title}>{error ? 'Retrouvons votre foyer' : introduction ? 'Préparons votre accueil' : 'Retrouvons votre foyer'}</Text>
      <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={ui.text}>{error || 'Nous lisons les données enregistrées sur cet appareil.'}</Text>
      <Text style={ui.note}>Votre parcours reprendra après restauration. Aucune donnée n’est effacée.</Text>
      {error && retry && <Action label="Réessayer la restauration" onPress={retry} />}
    </View>
  </DashboardPage>;
}

export function SaveWarning({ message, retry }: { message: string; retry: () => void }) {
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: '#F6EAF3', flexShrink: 0 }}>
    <View style={{ paddingHorizontal: 20, paddingVertical: 8, gap: 4 }}>
      <Text accessibilityRole="alert" style={ui.text}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={ui.link}>Réessayer la sauvegarde</Text></Pressable>
    </View>
  </SafeAreaView>;
}
