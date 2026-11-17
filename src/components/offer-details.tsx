import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ui } from './dashboard-ui';

// Native implementation of the feature-list / pricing-FAQ patterns reviewed on
// 21st.dev. No DOM, Tailwind, motion runtime or copied web component source.
type FeatureIcon = 'refresh' | 'devices' | 'simulate' | 'usage';
const symbols: Record<FeatureIcon, string> = { refresh: '↻', devices: '▤', simulate: '⇄', usage: '◷' };

export function OfferFeature({ title, description, icon, onPress, accessibilityLabel }: {
  title: string; description?: string; icon: FeatureIcon; onPress?: () => void; accessibilityLabel?: string;
}) {
  const content = <>
    <View accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}><Text style={styles.symbol}>{symbols[icon]}</Text></View>
    <View style={styles.copy}><Text style={styles.featureTitle}>{title}</Text>{description && <Text style={ui.note}>{description}</Text>}</View>
    {onPress && <View accessible={false} aria-hidden style={styles.chevron} />}
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable>
    : <View style={styles.row}>{content}</View>;
}

export function OfferPrice() {
  return <View style={styles.price}>
    <View style={styles.priceHeader}><Text style={styles.priceLabel}>APP-CIE PREMIUM</Text><View style={styles.status}><Text style={styles.statusText}>Bientôt disponible</Text></View></View>
    <View style={styles.priceValue}><Text style={styles.amount}>2 000</Text><Text style={styles.unit}>FCFA / an</Text></View>
    <Text style={styles.priceNote}>Souscription bientôt disponible. Aucun paiement ne vous sera demandé.</Text>
  </View>;
}

export function OfferQuestions() {
  const [opened, setOpened] = useState<string | null>(null);
  const questions = [
    { id: 'discovery', question: 'La découverte reste-t-elle gratuite ?', answer: 'Oui. Votre première estimation et ses explications restent gratuites, sans inscription. Premium concerne les actualisations, la répartition complète et les simulations avec vos appareils.' },
    { id: 'purchase', question: 'Puis-je déjà m’abonner ?', answer: 'Abonnement bientôt disponible. Le paiement n’est pas encore intégré : aucun achat ni prélèvement n’est possible ici. Le prix prévu est de 2 000 FCFA par an, sans promesse d’économie garantie.' },
    { id: 'data', question: 'Où sont conservées mes données ?', answer: 'Votre foyer, vos appareils, votre relevé et votre première estimation sont sauvegardés localement sur cet appareil. Il ne s’agit pas d’une synchronisation entre appareils. Les scénarios enregistrés restent sur cet appareil.' },
  ];
  return <View style={ui.card}><Text accessibilityRole="header" style={ui.heading}>Vos questions</Text>{questions.map(({ id, question, answer }) => {
    const expanded = opened === id;
    return <View key={id} style={styles.question}>
      <Pressable accessibilityRole="button" accessibilityLabel={question} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setOpened(expanded ? null : id)} style={({ pressed }) => [styles.questionButton, pressed && styles.pressed]}>
        <Text style={[ui.text, styles.questionText]}>{question}</Text><View accessible={false} aria-hidden style={[styles.chevron, styles.down, expanded && styles.up]} />
      </Pressable>{expanded && <Text style={[ui.text, styles.answer]}>{answer}</Text>}
    </View>;
  })}</View>;
}

export function ComingFeatures() {
  return <View style={{ gap: 6, paddingHorizontal: 4 }}><Text accessibilityRole="header" style={ui.heading}>À venir</Text><Text style={ui.note}>Historique et rappels.</Text></View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 60, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  featureTitle: { color: '#142142', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3EAF2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  symbol: { fontSize: 22, color: '#007FAF' },
  chevron: { width: 8, height: 8, borderRightWidth: 1.5, borderTopWidth: 1.5, borderColor: '#59667D', transform: [{ rotate: '45deg' }], marginRight: 3, flexShrink: 0 },
  pressed: { opacity: 0.65 },
  price: { backgroundColor: '#142142', borderRadius: 24, padding: 24, gap: 14 },
  priceHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, lineHeight: 18, color: '#D1DAEC', fontWeight: '700', letterSpacing: 0.5 },
  status: { borderWidth: 1, borderColor: '#59667D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, lineHeight: 18, color: '#FFFFFF', fontWeight: '600' },
  priceValue: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 10, rowGap: 2 },
  amount: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 17, lineHeight: 25, color: '#FFFFFF', fontWeight: '600' },
  priceNote: { color: '#D1DAEC', fontSize: 14, lineHeight: 22 },
  comingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 3 },
  comingPill: { borderRadius: 10, backgroundColor: '#F8FAF9', paddingHorizontal: 10, paddingVertical: 5 },
  comingText: { color: '#59667D', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  question: { borderTopWidth: 1, borderTopColor: '#E3E8F0' },
  questionButton: { minHeight: 52, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  questionText: { flex: 1, minWidth: 0, fontWeight: '600' },
  down: { transform: [{ rotate: '135deg' }] },
  up: { transform: [{ rotate: '-45deg' }] },
  answer: { paddingBottom: 14 },
});
