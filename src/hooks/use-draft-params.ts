import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { useSetupDraft } from '@/components/setup-draft';
import { SETUP_ROUTES } from '@/utils/local-draft';
import type { SetupParams } from '@/utils/setup-params';

export function useDraftParams<T extends SetupParams = SetupParams>(): T {
  const route = useLocalSearchParams<T>();
  const pathname = usePathname();
  const { setup, setSetup, resumeRoute, setResumeRoute } = useSetupDraft();
  const [acceptedKey, setAcceptedKey] = useState<string | null>(null);
  const [resuming] = useState(resumeRoute === pathname && Object.keys(setup).length > 0);
  const key = JSON.stringify(Object.fromEntries(Object.entries(route).filter(([name, value]) => typeof value === 'string' && ['homeName', 'commune', 'category', 'amperage', 'balanceStatus', 'balanceKWh', 'validatedAt', 'appliances'].includes(name)).sort(([a], [b]) => a.localeCompare(b))));
  useFocusEffect(useCallback(() => {
    const incoming: SetupParams = JSON.parse(key);
    // A screen kept in the back stack still has its old URL parameters. Import
    // a given URL once; refocusing must not overwrite edits made since then.
    if (acceptedKey !== key) {
      if (Object.keys(incoming).length) setSetup((current) => acceptedKey === null && resuming ? { ...incoming, ...current } : { ...current, ...incoming });
      setAcceptedKey(key);
    }
    if (SETUP_ROUTES.some((p) => p === pathname)) setResumeRoute(pathname);
  }, [key, acceptedKey, resuming, pathname, setSetup, setResumeRoute]));
  return (acceptedKey === key || (acceptedKey === null && resuming) ? { ...route, ...setup } : { ...setup, ...route }) as T;
}
