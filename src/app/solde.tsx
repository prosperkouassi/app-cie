import { useState } from 'react';
import { router } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { withSetupAccess } from '@/components/access-gate';
import { ui } from '@/components/dashboard-ui';
import { StatusBar } from 'expo-status-bar';
import {
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSetupDraft } from '@/components/setup-draft';
import { balanceParams, householdParams, parseKWh, readBalance, scalar as first, type Balance, type SetupParams } from '@/utils/setup-params';

function SoldeScreen() {
  const params = useDraftParams<SetupParams>();
  const { balanceInput, setBalanceInput: setInput } = useSetupDraft();
  const input = balanceInput ?? String(readBalance(params).kWh ?? '');
  const [error, setError] = useState('');

  function openAppliances(balance: Balance) {
    Keyboard.dismiss();
    setError('');
    router.push({ pathname: '/appareils', params: {
      ...householdParams(params), ...balanceParams(balance),
    } });
  }

  const category = first(params.category);
  const amperage = first(params.amperage);
  const categoryLabel = category === 'social' ? 'Domestique social'
    : category === 'general' ? 'Domestique général' : 'Je ne sais pas';
  const amperageLabel = ['5', '10', '15', '20'].includes(amperage || '')
    ? `${amperage} A` : amperage === 'other' ? 'Autre' : 'Je ne sais pas';

  function validate() {
    const value = parseKWh(input);
    if (value === null) {
      setError('Saisissez un nombre positif ou nul en kWh, par exemple 12,5 ou 0.');
      return;
    }
    openAppliances({ kWh: value, validatedAt: new Date().toISOString() });
  }

  function goBack() {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/abonnement', params });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
            <Text style={styles.link}>‹ Retour à l’abonnement</Text>
          </Pressable>
          <Text style={styles.eyebrow}>ÉTAPE 3 SUR 5 · VOTRE SOLDE</Text>
          <View style={styles.track}><View style={styles.progress} /></View>
          <Text style={styles.title}>Mon solde en kWh</Text>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{first(params.homeName) || 'Ma maison'}</Text>
            <Text style={styles.description}>{first(params.commune) || 'Commune non renseignée'}</Text>
            <Text style={styles.description}>Catégorie : {categoryLabel}{'\n'}Ampérage : {amperageLabel}</Text>
          </View>
          <View style={styles.help}>
            <Text style={styles.sectionTitle}>Le total affiché au compteur</Text>
            <Text style={styles.description}>Recopiez le total restant en kWh, pas les FCFA ni la dernière recharge.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Solde restant (kWh)</Text>
            <TextInput accessibilityLabel="Solde total restant en kilowattheures"
              accessibilityHint="Virgule ou point accepté. Zéro est un solde valide."
              value={input} onChangeText={(text) => { setInput(text); setError(''); }}
              placeholder="Ex. 12,5" placeholderTextColor="#68738A"
              keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={validate}
              selectionColor="#4E8425" style={[styles.input, !!error && styles.inputError]} />
            <Text style={styles.description}>0 kWh accepté · Virgule ou point.</Text>
            {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          </View>
          <Pressable accessibilityRole="button" onPress={validate}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Je valide mon solde</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.later}
            onPress={() => openAppliances({ kWh: null, validatedAt: null })}>
            <Text style={styles.link}>Je le renseignerai plus tard</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default withSetupAccess(SoldeScreen);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: ui.screen,
  content: ui.content,
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: '#142142', fontSize: 16, fontWeight: '600' },
  eyebrow: { color: '#68738A', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  track: { height: 5, borderRadius: 3, backgroundColor: '#E3E6F0', overflow: 'hidden' },
  progress: { width: '60%', height: '100%', backgroundColor: '#4E8425' },
  title: ui.title,
  sectionTitle: { color: '#18223B', fontSize: 18, fontWeight: '700' },
  description: { color: '#35415B', fontSize: 15, lineHeight: 23 },
  card: ui.card,
  help: { padding: 20, borderRadius: 20, backgroundColor: '#EDF5E7', gap: 10 },
  input: { minHeight: 56, padding: 14, borderWidth: 1, borderColor: '#9AA3B5', borderRadius: 12, color: '#18223B', fontSize: 22 },
  inputError: { borderColor: '#315E19' },
  error: { color: '#315E19', fontSize: 14, lineHeight: 22 },
  button: ui.action,
  buttonText: ui.actionText,
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 10 },
  pressed: { opacity: 0.8 },
});
