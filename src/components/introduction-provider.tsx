import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeIntroduction, INTRODUCTION_KEY, type IntroductionRecord } from '@/utils/introduction';
import { readWithDeadline } from '@/utils/storage-read';

type Introduction = { ready: boolean; seen: boolean; error: string | null; complete: () => Promise<boolean> };
const Context = createContext<Introduction | null>(null);
export function IntroductionProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    readWithDeadline(() => AsyncStorage.getItem(INTRODUCTION_KEY)).then((raw) => {
      const restored = decodeIntroduction(raw);
      if (active) setSeen(restored);
    }).catch(() => {
      if (active) setError('Le statut de la présentation n’a pas pu être restauré. Les données de votre foyer sont conservées séparément.');
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const complete = useCallback(async () => {
    // Session fallback avoids a navigation loop when local storage is unavailable.
    setSeen(true);
    try {
      const record: IntroductionRecord = { version: 1, seen: true };
      await AsyncStorage.setItem(INTRODUCTION_KEY, JSON.stringify(record));
      setError(null); return true;
    } catch {
      setError('La présentation n’a pas pu être mémorisée. Vous pouvez réessayer ou continuer ; elle pourra réapparaître à la prochaine ouverture.');
      return false;
    }
  }, []);
  return <Context.Provider value={{ ready, seen, error, complete }}>{children}</Context.Provider>;
}
export function useIntroduction() {
  const value = useContext(Context);
  if (!value) throw new Error('IntroductionProvider is required');
  return value;
}
