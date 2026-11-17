import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

export function ReplayIntroductionLink() {
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/bienvenue', params: { mode: 'replay' } })} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, paddingVertical: 12, alignSelf: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}>
    <Text style={{ color: '#59667D', fontSize: 13, lineHeight: 20, textDecorationLine: 'underline', textAlign: 'center' }}>Revoir la présentation</Text>
  </Pressable>;
}
