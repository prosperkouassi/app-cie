import { useRef, useState, type ComponentRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Action, ui } from '@/components/dashboard-ui';
import { WelcomeLayout } from '@/components/welcome-layout';
import { WelcomeAnimation } from '@/components/welcome-animation';
import { useSetupDraft } from '@/components/setup-draft';
import { useIntroduction } from '@/components/introduction-provider';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { INTRODUCTION_PAGES } from '@/utils/introduction';

export default function BienvenueScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const replay = mode === 'replay';
  const { snapshot, resumeRoute, setup } = useSetupDraft();
  const { complete, error } = useIntroduction();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const page = INTRODUCTION_PAGES[step];
  function changeStep(next: number) {
    setStep(next); scroll.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(`${next + 1} sur 3. ${INTRODUCTION_PAGES[next].title}. ${INTRODUCTION_PAGES[next].text}`);
  }
  function leave() {
    if (snapshot) router.replace('/tableau-de-bord');
    else router.replace({ pathname: resumeRoute as '/', params: { ...setup, start: 'true' } });
  }
  async function finish(returnToPrevious = false) {
    if (saving) return;
    setSaving(true);
    const saved = await complete();
    setSaving(false);
    if (saved) {
      if (returnToPrevious && replay && router.canGoBack()) router.back();
      else leave();
    } else setSaveFailed(true);
  }
  return <WelcomeLayout scrollRef={scroll} header={<View style={styles.navigation}>
    <View style={styles.brand}><Text style={ui.heading}>app-CIE</Text></View>
    <View style={styles.headerActions}>
      {step > 0 ? <Pressable accessibilityRole="button" onPress={() => changeStep(step - 1)} style={styles.touch}><Text style={ui.link}>‹ Retour</Text></Pressable> : <View style={styles.backSpace} />}
      <Pressable accessibilityRole="button" disabled={saving} accessibilityState={{ disabled: saving }} onPress={() => finish(true)} style={styles.touch}><Text style={ui.link}>Passer</Text></Pressable>
    </View>
  </View>} footer={<>
    <View accessible accessibilityRole="image" accessibilityLabel={`Étape ${step + 1} sur 3 : ${page.title}`} style={styles.progress}>
      <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dots}>
        {INTRODUCTION_PAGES.map((item, index) => <View key={item.title} style={styles.indicator}><View style={[styles.dot, index === step && styles.activeDot]} /></View>)}
      </View>
    </View>
    {saveFailed ? <View style={ui.card}><Text accessibilityRole="alert" style={ui.text}>{error}</Text><Action label="Réessayer l’enregistrement" onPress={finish} /><Action label="Continuer sans enregistrer" secondary onPress={leave} /></View>
      : saving ? <Text accessibilityLiveRegion="polite" style={ui.text}>Enregistrement de votre choix…</Text> : <Action tone={step < 2 ? 'cyan' : undefined} label={step === 2 ? 'Commencer' : 'Suivant'} onPress={step === 2 ? finish : () => changeStep(step + 1)} />}
    {step === 2 && <Action label="Découvrir Premium" secondary onPress={() => router.push('/premium')} />}
    {!!error && !saveFailed && <Text style={ui.note}>{error}</Text>}
  </>}>
    <View style={[ui.card, styles.art]}><WelcomeAnimation key={step} page={step} reduced={reduced} /></View>
    <View accessibilityLiveRegion="polite" style={{ gap: 12 }}><Text accessibilityRole="header" style={styles.title}>{page.title}</Text><View style={ui.card}><Text style={[ui.text, { textAlign: 'center' }]}>{page.text}</Text></View></View>

  </WelcomeLayout>;
}
const styles = StyleSheet.create({
  navigation: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  brand: { minHeight: 44, justifyContent: 'center' },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  touch: { minWidth: 44, minHeight: 44, paddingHorizontal: 8, paddingVertical: 10, justifyContent: 'center' },
  backSpace: { minWidth: 76, minHeight: 44 },
  art: { padding: 12, alignItems: 'center' },
  title: { color: '#4E8425', textAlign: 'center', fontSize: 28, fontWeight: '800' },
  price: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E3E8F0', backgroundColor: '#FFFFFF', gap: 4 },
  priceText: { color: '#007FAF', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  progress: { alignSelf: 'center', minHeight: 32, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  indicator: { width: 28, height: 24, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 5, backgroundColor: '#A3AEC0' },
  activeDot: { width: 28, backgroundColor: '#4E8425' },
});
