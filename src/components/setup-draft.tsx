import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApplianceId, SetupParams } from '@/utils/setup-params';
import { createQuickEquipment, ensureFirstEquipment, type ConfiguredEquipment } from '@/utils/quick-equipment';
import { accessRights, canManageScenarios, canEditSetup, canUpdateBalance, type Access } from '@/utils/access';
import { readingParams, type ReadingInput } from '@/utils/balance-reading';
import { saveScenario, type SavedScenario, type ScenarioInput } from '@/utils/saved-scenarios';
import { createSnapshot, decodeDraft, validEquipment, STORAGE_KEY, type DiscoverySnapshot, type LocalDraft } from '@/utils/local-draft';
import { readWithDeadline, StorageReadTimeout } from '@/utils/storage-read';

type Draft = {
  updateProfile: (profile: { firstName?: string; avatar?: string }) => void;
  updateBalance: (input: ReadingInput) => Promise<SetupParams>;
  scenarios: SavedScenario[];
  storeScenario: (input: ScenarioInput, id?: string) => Promise<SavedScenario>;
  deleteScenario: (id: string) => Promise<void>;
  setup: SetupParams;
  setSetup: Dispatch<SetStateAction<SetupParams>>;
  resumeRoute: string;
  setResumeRoute: Dispatch<SetStateAction<string>>;
  snapshot: DiscoverySnapshot | null;
  finalizeDiscovery: (params: SetupParams, records: ConfiguredEquipment[], types: ApplianceId[]) => boolean;
  access: Access;
  setTestPremium: (enabled: boolean) => void;
  ready: boolean;
  storageError: string | null;
  retryStorage: () => void;
  balanceInput: string | null;
  setBalanceInput: Dispatch<SetStateAction<string | null>>;
  selected: ApplianceId[];
  setSelected: Dispatch<SetStateAction<ApplianceId[]>>;
  equipment: ConfiguredEquipment[];
  setEquipment: Dispatch<SetStateAction<ConfiguredEquipment[]>>;
  addEquipment: (type: ApplianceId) => void;
  ensureEquipment: (types: ApplianceId[]) => void;
};

const DraftContext = createContext<Draft | null>(null);

export function SetupDraftProvider({ children }: PropsWithChildren) {
  const [scenarios, rawScenarios] = useState<SavedScenario[]>([]);
  const scenariosRef = useRef<SavedScenario[]>([]);
  const scenarioBusy = useRef(false);
  const balanceBusy = useRef(false);
  const [balanceInput, rawBalance] = useState<string | null>(null);
  const [selected, rawSelected] = useState<ApplianceId[]>([]);
  const [equipment, rawEquipment] = useState<ConfiguredEquipment[]>([]);
  const [setup, rawSetup] = useState<SetupParams>({});
  const [resumeRoute, rawRoute] = useState('/');
  const [snapshot, setSnapshot] = useState<DiscoverySnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [testPremium, rawTestPremium] = useState(false);
  const [retry, setRetry] = useState(0);
  const access = accessRights(__DEV__, testPremium, snapshot !== null);
  const accessRef = useRef(access);
  const readyRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    accessRef.current = accessRights(__DEV__, testPremium, snapshot !== null);
    snapshotRef.current = snapshot;
  }, [testPremium, snapshot]);
  const nextId = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const setBalanceInput: Draft['setBalanceInput'] = (value) => { if (canEditSetup(accessRef.current)) rawBalance(value); };
  const setSelected: Draft['setSelected'] = (value) => { if (canEditSetup(accessRef.current)) rawSelected(value); };
  const setEquipment: Draft['setEquipment'] = (value) => { if (canEditSetup(accessRef.current)) rawEquipment(value); };
  const setSetup: Draft['setSetup'] = useCallback((value) => { if (canEditSetup(accessRef.current)) rawSetup(value); }, []);
  const setResumeRoute: Draft['setResumeRoute'] = useCallback((value) => { if (canEditSetup(accessRef.current)) rawRoute(value); }, []);
  const latest = useRef<LocalDraft>({ version: 2, balanceInput, selected, equipment, setup, resumeRoute, snapshot, scenarios });
  useEffect(() => {
    if (readyRef.current) return;
    let active = true;
    readWithDeadline(() => AsyncStorage.getItem(STORAGE_KEY)).then((raw) => {
      const restored = raw === null ? null : decodeDraft(raw);
      if (!active) return;
      if (restored) {
        scenariosRef.current = restored.scenarios ?? []; rawScenarios(scenariosRef.current);
        latest.current = { ...restored, version: 2, scenarios: scenariosRef.current };
        rawBalance(restored.balanceInput); rawSelected(restored.selected); rawEquipment(restored.equipment);
        rawSetup(restored.setup); rawRoute(restored.resumeRoute); setSnapshot(restored.snapshot);
        snapshotRef.current = restored.snapshot;
        accessRef.current = accessRights(__DEV__, false, restored.snapshot !== null);
        nextId.current = restored.equipment.reduce((max, item) => Math.max(max, Number(item.id.replace('equipment-', '')) || 0), 0);
      }
      readyRef.current = true; setStorageError(null); setReady(true);
    }).catch((error) => { if (active) setStorageError(error instanceof StorageReadTimeout
      ? 'La lecture de votre foyer ne répond pas. Réessayez : aucune donnée n’a été effacée ni remplacée.'
      : 'Impossible de restaurer les données locales. Vos données existantes ne seront pas écrasées.'); });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => { latest.current = { version: 2, balanceInput, selected, equipment, setup, resumeRoute, snapshot, scenarios }; }, [balanceInput, selected, equipment, setup, resumeRoute, snapshot, scenarios]);
  useEffect(() => {
    if (!ready) return;
    // Serialize writes so an older save can never finish after a newer one.
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...latest.current, scenarios: scenariosRef.current }))).then(() => setStorageError(null)).catch(() => setStorageError('Sauvegarde locale impossible. Gardez l’application ouverte et réessayez.'));
  }, [ready, balanceInput, selected, equipment, setup, resumeRoute, snapshot, retry]);
  async function changeSavedScenarios(change: (current: SavedScenario[]) => SavedScenario[]) {
    if (!readyRef.current || !canManageScenarios(accessRef.current)) throw new Error('Premium est nécessaire pour gérer vos scénarios.');
    if (scenarioBusy.current) throw new Error('Un enregistrement est déjà en cours.');
    scenarioBusy.current = true;
    try {
      const operation = writes.current.catch(() => {}).then(async () => {
        if (!canManageScenarios(accessRef.current)) throw new Error('Premium est nécessaire pour gérer vos scénarios.');
        const next = change(scenariosRef.current);
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...latest.current, scenarios: next })); }
        catch { throw new Error('Impossible d’enregistrer sur cet appareil. Vos réglages sont conservés ; réessayez.'); }
        scenariosRef.current = next; rawScenarios(next);
      });
      writes.current = operation.catch(() => {});
      await operation;
    } finally { scenarioBusy.current = false; }
  }
  async function storeScenario(input: ScenarioInput, id?: string) {
    if (!input.reference.every(validEquipment) || !input.simulated.every(validEquipment)) throw new Error('Appareils invalides.');
    let saved!: SavedScenario;
    await changeSavedScenarios(current => {
      const previous = id ? current.find(s => s.id === id) : undefined;
      if (id && !previous) throw new Error('Ce scénario n’existe plus.');
      saved = saveScenario(input, previous);
      return previous ? current.map(s => s.id === id ? saved : s) : [...current, saved];
    });
    return saved;
  }
  async function deleteScenario(id: string) { await changeSavedScenarios(current => current.filter(s => s.id !== id)); }
  async function updateBalance(input: ReadingInput): Promise<SetupParams> {
    if (!readyRef.current) throw new Error('Attendez la restauration de votre foyer.');
    if (!canUpdateBalance(accessRef.current)) throw new Error('Premium est nécessaire pour mettre à jour votre solde.');
    if (balanceBusy.current) throw new Error('Un enregistrement est déjà en cours.');
    const reading = readingParams(input);
    const enteredBalance = input.balance.trim();
    balanceBusy.current = true;
    try {
      let saved!: SetupParams;
      const operation = writes.current.catch(() => {}).then(async () => {
        if (!canUpdateBalance(accessRef.current)) throw new Error('Premium est nécessaire pour mettre à jour votre solde.');
        saved = { ...latest.current.setup, ...reading };
        const next = { ...latest.current, setup: saved, balanceInput: enteredBalance, scenarios: scenariosRef.current };
        try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
        catch { throw new Error('Impossible d’enregistrer le solde. Votre saisie est conservée ; réessayez.'); }
        // Publish only after confirmation. Queued automatic/scenario writes must see
        // the committed reading immediately, before React runs its next effects.
        saved = { ...latest.current.setup, ...reading };
        latest.current = { ...latest.current, setup: saved, balanceInput: enteredBalance };
        rawSetup(current => ({ ...current, ...reading })); rawBalance(enteredBalance);
        setStorageError(null);
      });
      writes.current = operation.catch(() => {});
      await operation;
      return saved;
    } finally { balanceBusy.current = false; }
  }
  function finalizeDiscovery(params: SetupParams, records: ConfiguredEquipment[], types: ApplianceId[]) {
    if (snapshotRef.current) return accessRef.current.premium;
    const result = createSnapshot(records, types, params);
    if (!result) return false;
    snapshotRef.current = result;
    accessRef.current = { ...accessRef.current, discoveryComplete: true };
    rawSetup(current => ({ ...current, ...params })); rawSelected(types); rawEquipment(records); setSnapshot(result);
    return true;
  }
  function addEquipment(type: ApplianceId) {
    if (!canEditSetup(accessRef.current)) return;
    const record = createQuickEquipment(`equipment-${++nextId.current}`, type);
    setEquipment((current) => [...current, record]);
  }
  const ensureEquipment = useCallback((types: ApplianceId[]) => {
    if (!canEditSetup(accessRef.current)) return;
    // Allocate candidates outside the updater: React may replay state updaters.
    const candidates = types.map((type) => createQuickEquipment(`equipment-${++nextId.current}`, type));
    rawEquipment((current) => ensureFirstEquipment(current, candidates));
  }, []);
  return <DraftContext.Provider value={{ updateProfile: profile => {
    if (!readyRef.current) return;
    // Profile editing is available in discovery; never spread untrusted fields
    // into the household through this deliberately narrower mutation path.
    rawSetup(current => ({ ...current,
      ...(typeof profile.firstName === 'string' ? { firstName: profile.firstName.slice(0, 40) } : {}),
      ...(typeof profile.avatar === 'string' && ['◉', '🌿', '☀', '🏡'].includes(profile.avatar) ? { avatar: profile.avatar } : {}),
    }));
  }, updateBalance, scenarios, storeScenario, deleteScenario, setup, setSetup, resumeRoute, setResumeRoute, snapshot, finalizeDiscovery, access,
    setTestPremium: (enabled) => { if (__DEV__) { accessRef.current = accessRights(true, enabled, snapshotRef.current !== null); rawTestPremium(enabled); } }, ready, storageError, retryStorage: () => { if (!readyRef.current) setStorageError(null); setRetry((n) => n + 1); },
    balanceInput, setBalanceInput, selected, setSelected, equipment, setEquipment, addEquipment, ensureEquipment }}>
    {children}
  </DraftContext.Provider>;
}

export function useSetupDraft() {
  const draft = useContext(DraftContext);
  if (!draft) throw new Error('SetupDraftProvider is required');
  return draft;
}
