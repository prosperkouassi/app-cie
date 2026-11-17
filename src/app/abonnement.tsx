import { useRouter } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { withSetupAccess } from '@/components/access-gate';
import { useSetupDraft } from '@/components/setup-draft';
import { ui } from '@/components/dashboard-ui';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChoiceProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Choice({ label, selected, onPress }: ChoiceProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text
        style={[
          styles.choiceText,
          selected && styles.choiceTextSelected,
        ]}
      >
        {label}
      </Text>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

function AbonnementScreen() {
  const router = useRouter();
  const params = useDraftParams<{
    homeName?: string;
    commune?: string;
  }>();
  const { homeName, commune } = params;
  const { setup, setSetup, setResumeRoute } = useSetupDraft();

  const category = typeof setup.category === 'string' ? setup.category : 'unknown';
  const amperage = typeof setup.amperage === 'string' ? setup.amperage : 'unknown';
  const setCategory = (category: string) => setSetup((s) => ({ ...s, category }));
  const setAmperage = (amperage: string) => setSetup((s) => ({ ...s, amperage }));

  const categories = [
    { value: 'social', label: 'Domestique social' },
    { value: 'general', label: 'Domestique général' },
    { value: 'unknown', label: 'Je ne sais pas' },
  ];

  const amperages = [
    { value: '5', label: '5 A' },
    { value: '10', label: '10 A' },
    { value: '15', label: '15 A' },
    { value: '20', label: '20 A' },
    { value: 'other', label: 'Autre' },
    { value: 'unknown', label: 'Je ne sais pas' },
  ];

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          onPress={() => { setResumeRoute('/'); if (router.canGoBack()) router.back(); else router.replace('/'); }}
          style={styles.back}
        >
          <Text style={styles.backText}>‹ Retour au foyer</Text>
        </Pressable>

        <Text style={styles.eyebrow}>
          ÉTAPE 2 SUR 5 · VOTRE ABONNEMENT
        </Text>

        <View style={styles.track}>
          <View style={styles.progress} />
        </View>

        <Text style={styles.title}>
          Votre abonnement{'\n'}électrique
        </Text>

        <Text style={styles.description}>
          Il s’agit du contrat électrique du foyer, distinct de l’offre Premium de l’application.{'\n'}
          Ces informations serviront à identifier le tarif applicable.
          Vous pourrez les compléter plus tard.
        </Text>

        <View style={styles.household}>
          <Text style={styles.householdTitle}>
            {homeName || 'Ma maison'}
          </Text>
          <Text style={styles.description}>
            {commune || 'Commune non renseignée'} · Compteur prépayé
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Catégorie tarifaire</Text>

        <View style={styles.options}>
          {categories.map((item) => (
            <Choice
              key={item.value}
              label={item.label}
              selected={category === item.value}
              onPress={() => {
                setCategory(item.value);
              }}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ampérage souscrit</Text>

        <View style={styles.options}>
          {amperages.map((item) => (
            <Choice
              key={item.value}
              label={item.label}
              selected={amperage === item.value}
              onPress={() => {
                setAmperage(item.value);
              }}
            />
          ))}
        </View>

        <View style={styles.help}>
          <Text style={styles.helpTitle}>
            Vous ne connaissez pas ces informations ?
          </Text>
          <Text style={styles.helpText}>
            Consultez votre contrat ou un justificatif CIE.
            L’ampérage seul ne suffit pas à déterminer la catégorie
            tarifaire. En attendant, votre autonomie pourra être
            estimée à partir du solde en kWh.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/solde', params: { homeName: homeName || 'Ma maison', commune: commune || '', category, amperage } })}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Continuer vers mon solde</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}
export default withSetupAccess(AbonnementScreen);

const styles = StyleSheet.create({
  screen: ui.screen,
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  back: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingRight: 16,
  },
  backText: { color: '#142142', fontSize: 16, fontWeight: '600' },
  eyebrow: {
    color: '#68738A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E3E6F0',
    overflow: 'hidden',
  },
  progress: {
    width: '40%',
    height: '100%',
    backgroundColor: '#4E8425',
  },
  title: {
    color: '#18223B',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: { color: '#68738A', fontSize: 15, lineHeight: 23 },
  household: {
    ...ui.card,
  },
  householdTitle: { color: '#18223B', fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: '#18223B', fontSize: 18, fontWeight: '700' },
  options: { gap: 10 },
  choice: {
    minHeight: 56,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceSelected: {
    backgroundColor: '#EDF5E7',
    borderColor: '#4E8425',
  },
  choiceText: { flex: 1, color: '#18223B', fontSize: 16 },
  choiceTextSelected: { color: '#315E19', fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9AA3B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#4E8425' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4E8425',
  },
  help: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#E9ECF5',
    gap: 8,
  },
  helpTitle: { color: '#142142', fontSize: 16, fontWeight: '700' },
  helpText: { color: '#35415B', fontSize: 14, lineHeight: 22 },
  button: ui.action,
  buttonText: ui.actionText,
  pressed: { opacity: 0.8 },
});
