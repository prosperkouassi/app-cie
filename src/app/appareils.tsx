import { router } from 'expo-router';
import { useDraftParams } from '@/hooks/use-draft-params';
import { withSetupAccess } from '@/components/access-gate';
import { EquipmentIcon } from '@/components/equipment-icon';
import { Pressable, Text, View } from 'react-native';
import { EquipmentStep, equipmentStyles as styles } from '@/components/equipment-step';
import { useSetupDraft } from '@/components/setup-draft';
import { APPLIANCES, balanceParams, householdParams, readBalance, toggleAppliance, type SetupParams } from '@/utils/setup-params';

function AppareilsScreen() {
  const params = useDraftParams<SetupParams>();
  const { selected, setSelected, equipment, ensureEquipment } = useSetupDraft();
  const nextParams = {
    ...householdParams(params), ...balanceParams(readBalance(params)), appliances: selected.join(','),
  };
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/solde', params: nextParams });
  }
  return <EquipmentStep title="Quels appareils avez-vous ?" params={params} onBack={goBack} backLabel="Retour au solde">
    <Text style={styles.text}>Sélectionnez vos appareils.</Text>
    {equipment.length > 0 && <Text style={styles.note}>Un type décoché est exclu du calcul. Ses saisies restent conservées.</Text>}
    <View style={{ gap: 10 }}>
      {APPLIANCES.map(({ id, label }) => {
        const checked = selected.includes(id);
        return <Pressable key={id} accessibilityRole="checkbox" accessibilityLabel={label}
          accessibilityState={{ checked }} aria-checked={checked} onPress={() => setSelected((current) => toggleAppliance(current, id))}
          style={({ pressed }) => [styles.choice, checked && styles.selected, pressed && styles.pressed]}>
          <EquipmentIcon type={id} size={36} />
          <Text style={styles.choiceText}>{label}{equipment.some((record) => record.type === id) ? ` · ${equipment.filter((record) => record.type === id).length} fiche(s) conservée(s)` : ''}</Text>
          <Text style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">{checked ? '✓' : '+'}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={styles.sectionTitle} accessibilityLiveRegion="polite">
      {selected.length} {selected.length > 1 ? 'types sélectionnés' : 'type sélectionné'}
    </Text>
    {selected.length === 0 && <Text style={styles.note}>Sélectionnez au moins un type pour continuer.</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: selected.length === 0 }}
      disabled={selected.length === 0} onPress={() => {
        if (selected.length > 0) {
          ensureEquipment(selected);
          router.push({ pathname: '/configuration-appareils', params: nextParams });
        }
      }} style={({ pressed }) => [styles.button, selected.length === 0 && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>Configurer mes appareils</Text>
    </Pressable>
  </EquipmentStep>;
}
export default withSetupAccess(AppareilsScreen);
