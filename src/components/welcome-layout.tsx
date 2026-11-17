import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ui } from './dashboard-ui';

// Fill a tall viewport, but let the full page grow and scroll when content needs
// more room. Nothing is fixed over the text or constrained to a screen height.
export function WelcomeLayout({ header, children, footer, scrollRef }: PropsWithChildren<{
  header: ReactNode; footer: ReactNode; scrollRef: ComponentProps<typeof ScrollView>['ref'];
}>) {
  return <SafeAreaView style={ui.screen}><StatusBar style="dark" />
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>{header}</View>
      <View style={styles.main}>{children}</View>
      <View style={styles.footer}>{footer}</View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, padding: 20, width: '100%', maxWidth: 560, alignSelf: 'center', gap: 20 },
  header: { flexShrink: 0 },
  main: { flexShrink: 0, gap: 20 },
  footer: { flexShrink: 0, marginTop: 'auto', paddingTop: 16, gap: 12 },
});
