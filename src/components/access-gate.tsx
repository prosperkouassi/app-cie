import type { ComponentType, PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useSetupDraft } from './setup-draft';
import { canEditSetup } from '@/utils/access';
import PremiumScreen from '@/app/premium';
import { useIntroduction } from './introduction-provider';
import { RestorationScreen, SaveWarning } from './storage-feedback';

export function RestorationGate({ children }: PropsWithChildren) {
  const draft = useSetupDraft();
  const introduction = useIntroduction();
  if (!draft.ready) return <RestorationScreen error={draft.storageError} retry={draft.retryStorage} />;
  if (!introduction.ready) return <RestorationScreen introduction />;
  // Keep the same navigator mounted even if a later save fails: do not discard
  // the current screen, its inputs or its back stack while offering a retry.
  return <View style={{ flex: 1 }}>
    {draft.storageError && <SaveWarning message={draft.storageError} retry={draft.retryStorage} />}
    <View style={{ flex: 1 }}>{children}</View>
  </View>;
}

// Guard before mounting forms: no effects, profile reconciliation or input writes run when locked.
export function withSetupAccess(Screen: ComponentType) {
  return function ProtectedSetupScreen() {
    const { access } = useSetupDraft();
    return canEditSetup(access) ? <Screen /> : <PremiumScreen />;
  };
}
