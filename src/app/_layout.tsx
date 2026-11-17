import { MainNavigation } from '@/components/main-navigation';
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { SetupDraftProvider } from '@/components/setup-draft';
import { RestorationGate } from '@/components/access-gate';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { IntroductionProvider } from '@/components/introduction-provider';
export { RouteLoading as SuspenseFallback } from '@/components/route-loading';

SplashScreen.preventAutoHideAsync();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4E8425',
    background: '#F8FAF9',
    card: '#FFFFFF',
    text: '#18223B',
    border: '#E5E8F0',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={appTheme}>
      <SetupDraftProvider>
        <IntroductionProvider>
        <AnimatedSplashOverlay />
        <RestorationGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: '#F8FAF9',
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="bienvenue" options={{ animation: 'none', gestureEnabled: false }} />
          <Stack.Screen name="abonnement" />
          <Stack.Screen name="solde" />
          <Stack.Screen name="appareils" />
          <Stack.Screen name="configuration-appareils" />
          <Stack.Screen name="tableau-de-bord" />
          <Stack.Screen name="explore" />
        </Stack>
        <MainNavigation />
        </RestorationGate>
        </IntroductionProvider>
      </SetupDraftProvider>
    </ThemeProvider>
  );
}
