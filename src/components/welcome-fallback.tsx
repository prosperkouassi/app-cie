import { StyleSheet, View } from 'react-native';

// Offline decorative fallback if a renderer fails; all information remains in the page text.
export function WelcomeFallback({ page }: { page: number }) {
  return <View accessible={false} aria-hidden style={styles.frame}>
    {page === 0 ? <View style={styles.house}><View style={styles.roof} /><View style={styles.appliances}><View style={styles.tv} /><View style={styles.fridge} /></View></View>
      : page === 1 ? <View style={styles.battery}><View style={styles.charge} /><View style={styles.terminal} /></View>
        : <View style={styles.chart}><View style={[styles.bar, { height: 110 }]} /><View style={[styles.bar, { height: 65, backgroundColor: '#4E8425' }]} /></View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { width: '100%', height: 210, alignItems: 'center', justifyContent: 'center' },
  house: { width: 150, height: 110, borderWidth: 4, borderColor: '#142142', borderRadius: 12, justifyContent: 'flex-end', padding: 16 },
  roof: { position: 'absolute', width: 106, height: 106, borderLeftWidth: 4, borderTopWidth: 4, borderColor: '#142142', transform: [{ rotate: '45deg' }], top: -56, left: 18 },
  appliances: { flexDirection: 'row', alignItems: 'flex-end', gap: 15 },
  tv: { width: 52, height: 36, borderWidth: 5, borderColor: '#142142', borderRadius: 5 },
  fridge: { width: 35, height: 62, backgroundColor: '#4E8425', borderRadius: 6 },
  battery: { width: 160, height: 85, borderWidth: 5, borderColor: '#142142', borderRadius: 18, padding: 9 },
  charge: { width: '75%', height: '100%', backgroundColor: '#4E8425', borderRadius: 6 },
  terminal: { position: 'absolute', right: -14, top: 22, width: 9, height: 30, backgroundColor: '#142142', borderRadius: 3 },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 30, borderBottomWidth: 4, borderColor: '#142142', paddingHorizontal: 20 },
  bar: { width: 42, backgroundColor: '#142142', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
});
