import { useState } from 'react';
import LottieView from 'lottie-react-native';
import { View } from 'react-native';
import { welcomeAnimations } from './welcome-animation-data';
import { WelcomeFallback } from './welcome-fallback';

export function WelcomeAnimation({ page, reduced }: { page: number; reduced: boolean }) {
  const [failed, setFailed] = useState(false);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: '100%', height: 210 }}>
    {failed ? <WelcomeFallback page={page} /> : <LottieView key={reduced ? 'static' : 'motion'} source={welcomeAnimations[page]} style={{ width: '100%', height: '100%' }} resizeMode="contain" autoPlay={!reduced} loop={false} progress={reduced ? 0 : undefined} onAnimationFailure={() => setFailed(true)} />}
  </View>;
}
