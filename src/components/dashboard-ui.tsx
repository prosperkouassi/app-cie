import type { ComponentProps, PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { barPercent } from '@/utils/dashboard';
import { design } from '@/constants/design';
import { ReplayIntroductionLink } from './replay-introduction-link';

export function DashboardPage({ children, showIntroductionLink = false, scrollRef }: PropsWithChildren<{ showIntroductionLink?: boolean; scrollRef?: ComponentProps<typeof ScrollView>['ref'] }>) {
  return <SafeAreaView style={ui.screen}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>{children}{showIntroductionLink && <ReplayIntroductionLink />}</ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
export function Action({ label, onPress, secondary = false, tone }: { label: string; onPress: () => void; secondary?: boolean; tone?: 'cyan' }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [ui.action, tone === 'cyan' && { backgroundColor: design.color.cyan }, secondary && ui.secondary, pressed && { opacity: 0.7 }]}><Text style={secondary ? ui.link : ui.actionText}>{label}</Text></Pressable>;
}
export function Bar({ value, total, label, color }: { value: number | null; total: number | null; label: string; color?: string }) {
  return <View accessible accessibilityLabel={label} style={ui.track}><View style={[ui.bar, { width: `${barPercent(value, total)}%` }, color ? { backgroundColor: color } : undefined]} /></View>;
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: design.color.background },
  content: { padding: design.space.page, paddingBottom: 32, gap: design.space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { padding: design.space.page, borderRadius: design.radius.card, backgroundColor: design.color.card, borderWidth: 1, borderColor: design.color.border, boxShadow: '0 3px 12px rgba(20,33,66,0.04)', gap: 12 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: design.type.title, fontWeight: '800', color: design.color.ink, flexShrink: 1 },
  heading: { fontSize: design.type.heading, fontWeight: '700', color: design.color.ink },
  text: { fontSize: design.type.body, lineHeight: 23, color: design.color.body },
  note: { fontSize: design.type.note, lineHeight: 20, color: design.color.muted },
  number: { fontSize: design.type.title, fontWeight: '800', color: design.color.ink, fontVariant: ['tabular-nums'] },
  link: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: design.color.cyan, textAlign: 'center' },
  touch: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  action: { minHeight: 54, padding: 16, borderRadius: design.radius.button, backgroundColor: design.color.green, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: design.color.card, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  secondary: { backgroundColor: design.color.card, borderWidth: 1, borderColor: design.color.border },
  track: { height: 7, borderRadius: 8, backgroundColor: design.color.track, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 8, backgroundColor: design.color.green },
  row: { gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: design.color.border },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: design.color.inputBorder, borderRadius: design.radius.field, color: design.color.ink, fontSize: 16, backgroundColor: design.color.card },
});
