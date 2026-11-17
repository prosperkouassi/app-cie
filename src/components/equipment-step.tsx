import type { ComponentProps, PropsWithChildren } from 'react';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { householdParams, readBalance, type SetupParams } from '@/utils/setup-params';
import { ui } from './dashboard-ui';

export function EquipmentStep({ children, onBack, backLabel, title, params, step = 4, scrollRef, onContentSizeChange, onScrollBeginDrag }: PropsWithChildren<{
  onBack: () => void; backLabel: string; title: string; params: SetupParams; step?: 4 | 5 | 'dashboard';
  scrollRef?: ComponentProps<typeof ScrollView>['ref'];
  onContentSizeChange?: (width: number, height: number) => void;
  onScrollBeginDrag?: () => void;
}>) {
  const household = householdParams(params);
  const balance = readBalance(params);
  const [householdOpen, setHouseholdOpen] = useState(false);
  return <SafeAreaView style={equipmentStyles.screen}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} onContentSizeChange={onContentSizeChange} onScrollBeginDrag={onScrollBeginDrag} contentContainerStyle={equipmentStyles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Pressable accessibilityRole="button" onPress={onBack} style={equipmentStyles.back}>
        <Text style={equipmentStyles.link}>‹ {backLabel}</Text>
      </Pressable>
      <Text style={equipmentStyles.eyebrow}>{step === 'dashboard' ? 'Votre tableau de bord' : `Étape ${step} sur 5 · ${step === 4 ? 'Vos équipements' : 'Configuration des appareils'}`}</Text>
      <View style={equipmentStyles.track}><View style={[equipmentStyles.progress, step !== 4 && { width: '100%' }]} /></View>
      <Text style={equipmentStyles.title}>{title}</Text>
      <View style={equipmentStyles.card}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: householdOpen }} aria-expanded={householdOpen} onPress={() => setHouseholdOpen(!householdOpen)} style={equipmentStyles.back}><Text style={equipmentStyles.link}>{household.homeName} · Détails {householdOpen ? '⌃' : '⌄'}</Text></Pressable>
        {householdOpen && <>
        <Text style={equipmentStyles.text}>{household.commune || 'Commune non renseignée'}</Text>
        <Text style={equipmentStyles.text}>
          {household.category === 'social' ? 'Domestique social' : household.category === 'general' ? 'Domestique général' : 'Catégorie non renseignée'}
          {' · '}{['5', '10', '15', '20'].includes(household.amperage) ? `${household.amperage} A` : household.amperage === 'other' ? 'Autre ampérage' : 'Ampérage non renseigné'}
        </Text>
        <Text style={equipmentStyles.text}>{balance.kWh === null ? 'Solde non renseigné · solde inconnu' : `Solde au relevé : ${balance.kWh.toLocaleString('fr-FR', { maximumSignificantDigits: 21 })} kWh`}</Text>
        {balance.validatedAt !== null && <Text style={equipmentStyles.note}>
          Relevé renseigné le {new Date(balance.validatedAt).toLocaleString('fr-FR')}
        </Text>}
        </>}
      </View>
      {children}
      <Text style={equipmentStyles.note}>Sauvegarde locale sur cet appareil, sans synchronisation.</Text>
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export const equipmentStyles = StyleSheet.create({
  screen: ui.screen,
  content: ui.content,
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: '#142142', fontSize: 16, fontWeight: '600' },
  eyebrow: { color: '#68738A', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  track: { height: 5, borderRadius: 3, backgroundColor: '#E3E6F0', overflow: 'hidden' },
  progress: { width: '80%', height: '100%', backgroundColor: '#4E8425' },
  title: ui.title,
  sectionTitle: { color: '#18223B', fontSize: 18, fontWeight: '700' },
  text: { color: '#35415B', fontSize: 15, lineHeight: 23 },
  card: ui.card,
  help: { padding: 20, borderRadius: 20, backgroundColor: '#EDF5E7', gap: 10 },
  choice: { minHeight: 56, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E8F0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selected: { backgroundColor: '#EDF5E7', borderColor: '#4E8425' },
  choiceText: { flex: 1, color: '#18223B', fontSize: 16 },
  mark: { color: '#315E19', fontSize: 22, fontWeight: '700' },
  button: ui.action,
  buttonText: ui.actionText,
  disabled: { backgroundColor: '#68738A', opacity: 0.6 },
  pressed: { opacity: 0.8 },
  note: { color: '#68738A', fontSize: 13, lineHeight: 20 },
  error: { color: '#315E19', fontSize: 14, lineHeight: 22 },
});
