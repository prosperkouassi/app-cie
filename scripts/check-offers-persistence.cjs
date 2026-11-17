/* global __dirname, setImmediate */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let draft, params = {}, routeCalls = [], writes = [], stored = null, failRead = false, failWrite = false, stallRead = false;
let hooks = [], cursor = 0, effects = [], development = true;
let writeGate = null;
const element = (type, props) => ({ type, props: props || {} });
const router = { navigate: (r) => routeCalls.push(r), push: (r) => routeCalls.push(r), replace: (r) => routeCalls.push(r), dismissTo: (r) => routeCalls.push(r), back: () => routeCalls.push('back'), canGoBack: () => true };
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  function requireMock(name) {
    if (name.endsWith('.svg')) return name;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '@/components/home-summary') return { HomeHeader: 'HomeHeader', HomeEquipment: 'HomeEquipment', BalanceHero: ({ duration }) => element('Text', { children: duration }) };
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      createContext: () => ({ Provider: 'Provider' }), useContext: () => draft,
      useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial; const state = hooks; return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
      useRef(value) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: value }); },
      useCallback(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((v, j) => v !== hooks[i].deps[j])) hooks[i] = { fn, deps }; return hooks[i].fn; },
      useEffect(fn, deps) { const i = cursor++; const old = hooks[i]; if (!old || deps.some((v, j) => v !== old.deps[j])) { hooks[i] = { deps }; effects.push(fn); } },
    };
    if (name === '@react-native-async-storage/async-storage') return { getItem: async () => { if (failRead) throw Error('read'); if (stallRead) return new Promise(() => {}); return stored; }, setItem: async (key, value) => { if (writeGate) await writeGate; if (failWrite) throw Error('write'); writes.push(value); stored = value; } };
    if (name === 'react-native') return new Proxy({ Keyboard: { dismiss() {} }, StyleSheet: { create: (v) => v }, Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 390, fontScale: 1 }) }, { get: (obj, key) => obj[key] || key });
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) };
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === 'expo-router') return { Redirect: 'Redirect', router, usePathname: () => '/mon-solde', useLocalSearchParams: () => params, usePreventRemove: () => () => {} };
    if (name === '@/hooks/use-draft-params') return { useDraftParams: () => ({ ...draft.setup, ...params }) };
    const base = name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(relative), name);
    return load(fs.existsSync(path.join(root, base + '.tsx')) ? base + '.tsx' : base + '.ts');
  }
  // Evaluate __DEV__ per module exactly as the bundle does; do not read URL/state for it.
  new Function('require', 'module', 'exports', '__DEV__', output)(requireMock, module, module.exports, development);
  cache.set(relative, module.exports);
  return module.exports;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
function renderProvider() { cursor = 0; effects = []; draft = load('src/components/setup-draft.tsx').SetupDraftProvider({}).props.value; effects.forEach((effect) => effect()); return draft; }
async function settle() { await tick(); renderProvider(); await tick(); renderProvider(); await tick(); }
function screen(fn) { const outerHooks = hooks; hooks = []; cursor = 0; const result = fn(); hooks = outerHooks; return result; }
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
function text(tree) { return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree && typeof tree === 'object' ? [tree.props.children].flat(Infinity).map(text).join('') : ''; }

(async () => {
  const { OfferQuestions } = load('src/components/offer-details.tsx');
  cursor = 0;
  let faq = OfferQuestions();
  let purchase = nodes(faq).find((n) => n.props.accessibilityLabel === 'Puis-je déjà m’abonner ?');
  assert.equal(purchase.props['aria-expanded'], false);
  purchase.props.onPress(); cursor = 0; faq = OfferQuestions();
  purchase = nodes(faq).find((n) => n.props.accessibilityLabel === 'Puis-je déjà m’abonner ?');
  assert.equal(purchase.props['aria-expanded'], true);
  assert.ok(text(faq).includes('aucun achat ni prélèvement'));
  purchase.props.onPress(); cursor = 0; faq = OfferQuestions();
  assert.equal(nodes(faq).find((n) => n.props.accessibilityLabel === 'Puis-je déjà m’abonner ?').props['aria-expanded'], false);
  hooks = [];
  const rights = load('src/utils/access.ts');
  assert.equal(rights.accessRights(false, true, true).premium, false);
  assert.equal(rights.accessRights(true, false, true).premium, false);
  assert.equal(rights.accessRights(true, true, true).premium, true);
  assert.equal(rights.canEditSetup(rights.accessRights(false, false, false)), true);
  const quick = load('src/utils/quick-equipment.ts');
  const storage = load('src/utils/local-draft.ts');
  renderProvider();
  assert.equal(draft.ready, false);
  await assert.rejects(draft.updateBalance({ balance: '12', date: '15/11/2026', time: '08:10' }), /restauration/);
  assert.equal(writes.length, 0, 'No initial empty write before hydration');
  await settle();
  assert.equal(draft.ready, true);
  await assert.rejects(draft.updateBalance({ balance: '12', date: '15/11/2026', time: '08:10' }), /Premium/);
  draft.setSetup({ homeName: 'Foyer sauvegardé', commune: 'Cocody' });
  draft.setResumeRoute('/solde'); draft.setBalanceInput('12,5'); draft.setSelected(['water-heater']); draft.ensureEquipment(['water-heater']);
  await settle();
  const id = draft.equipment[0].id;
  draft.setEquipment((records) => records.map((r) => quick.editEquipment(quick.confirmQuickEquipment(r), { cycles: '14' })));
  await settle();
  assert.equal(draft.equipment[0].cycles, '14', 'Corrections before validation are free');
  const equipment = JSON.stringify(draft.equipment);
  const reading = '2026-11-14T10:23:00.000Z';
  const input = { ...draft.setup, appliances: 'water-heater', balanceStatus: 'known', balanceKWh: '0', validatedAt: reading };
  assert.equal(draft.finalizeDiscovery(input, draft.equipment, draft.selected), true);
  draft.setEquipment([]); draft.setSetup({ homeName: 'forbidden' }); draft.setSelected([]);
  await settle();
  assert.equal(JSON.stringify(draft.equipment), equipment);
  assert.equal(draft.setup.homeName, 'Foyer sauvegardé');
  assert.equal(draft.snapshot.autonomy, 0);
  assert.equal(draft.snapshot.params.validatedAt, reading);
  const snapshotJSON = JSON.stringify(draft.snapshot);
  assert.equal(draft.finalizeDiscovery({}, [], []), false, 'Cannot replace discovery result');

  const gate = load('src/components/access-gate.tsx');
  for (const file of ['abonnement', 'solde', 'appareils', 'configuration-appareils', 'informations-foyer', 'nouveau-solde']) {
    params = { premium: 'true', testPremium: 'true', ...input, balanceKWh: '999' };
    const protectedTree = screen(load(`src/app/${file}.tsx`).default);
    assert.equal(protectedTree.type.name, 'PremiumScreen', `${file}: direct URL must be blocked before form mounts`);
  }
  assert.equal(screen(load('src/app/economies.tsx').default).props.href, '/premium');
  const discovery = screen(load('src/app/tableau-de-bord.tsx').default);
  assert.ok(nodes(discovery).some(n => n.props.duration === 'Crédit épuisé'));
  assert.ok(!text(discovery).includes('999'));
  assert.ok(text(discovery).includes('Comprendre le calcul'));
  const premiumRows = nodes(discovery).filter((node) => node.type?.name === 'OfferFeature');
  assert.equal(premiumRows.length, 3);
  for (const row of premiumRows) {
    assert.ok(row.props.accessibilityLabel.endsWith('· Premium'));
    row.props.onPress();
    assert.equal(routeCalls.at(-1), '/premium');
    assert.equal(JSON.stringify(draft.snapshot), snapshotJSON);
  }
  const premium = screen(load('src/app/premium.tsx').default);
  nodes(premium).find((n) => n.props.label === '‹ Retour').props.onPress();
  assert.equal(routeCalls.at(-1), 'back');
  assert.equal(JSON.stringify(draft.equipment), equipment);
  draft.setTestPremium(true); await settle();
  assert.equal(draft.access.premium, true);
  assert.equal(screen(load('src/app/economies.tsx').default).type.name, 'PersonalEconomiesScreen');
  assert.notEqual(screen(gate.withSetupAccess(() => null)).type.name, 'PremiumScreen');
  assert.equal(JSON.stringify(draft.snapshot), snapshotJSON);
  const saved = JSON.parse(stored);
  assert.equal('testPremium' in saved, false);
  assert.equal('access' in saved, false);
  stored = JSON.stringify({ ...saved, testPremium: true, access: { premium: true } });
  hooks = []; await settle();
  assert.equal(draft.access.premium, false, 'Test entitlement is not restored');
  assert.equal(draft.equipment[0].id, id);
  assert.equal(draft.equipment[0].cycles, '14');
  assert.equal(draft.balanceInput, '12,5');
  assert.equal(draft.resumeRoute, '/solde');
  assert.equal(JSON.stringify(draft.snapshot), snapshotJSON);
  const ids = draft.equipment.map((r) => r.id);
  draft.setTestPremium(true); await settle(); draft.addEquipment('fan'); await settle();
  assert.equal(new Set(draft.equipment.map((r) => r.id)).size, ids.length + 1);
  assert.equal(storage.createSnapshot(draft.equipment, ['water-heater'], { balanceStatus: 'unknown' }).autonomy, null);

  const writeCount = writes.length;
  hooks = []; failRead = true; renderProvider(); await settle();
  assert.equal(draft.ready, false); assert.ok(draft.storageError); assert.equal(writes.length, writeCount);
  failRead = false; draft.retryStorage(); await settle(); assert.equal(draft.ready, true);
  failWrite = true; draft.retryStorage(); await settle(); assert.ok(draft.storageError);
  const warningTree = screen(() => gate.RestorationGate({ children: 'current-screen' }));
  assert.ok(nodes(warningTree).some((node) => node.props.children === 'current-screen'), 'Save failure must keep the current route mounted');
  failWrite = false; draft.retryStorage(); await settle(); assert.equal(draft.storageError, null);
  const reader = load('src/utils/storage-read.ts');
  const originalRead = reader.readWithDeadline;
  reader.readWithDeadline = (read) => originalRead(read, 5);
  const beforeStall = stored;
  const beforeStallWrites = writes.length;
  hooks = []; stallRead = true; renderProvider();
  await new Promise((resolve) => setTimeout(resolve, 15)); renderProvider();
  assert.equal(draft.ready, false);
  assert.ok(draft.storageError.includes('ne répond pas'));
  assert.equal(stored, beforeStall); assert.equal(writes.length, beforeStallWrites);
  stallRead = false; draft.retryStorage(); await settle();
  assert.equal(draft.ready, true); assert.equal(JSON.stringify(draft.snapshot), snapshotJSON);
  reader.readWithDeadline = originalRead;
  assert.throws(() => storage.decodeDraft('{"version":99}'));
  assert.throws(() => storage.decodeDraft(JSON.stringify({ ...JSON.parse(stored), equipment: [{}] })));

  // Saved scenarios share the versioned write queue, but never the household arrays.
  {
  const savedTools = load('src/utils/saved-scenarios.ts');
  const engine = load('src/utils/consumption.ts');
  const fan = { ...engine.createEquipment('fan-saved', 'fan'), name: 'Ventilateur', quantity: '1', mode: 'power', watts: '45', hours: '8', days: '7', intermittent: false };
  const input = { name: 'Soirée', reference: [fan], simulated: [{ ...fan, hours: '4' }], selected: ['fan'], reading: { balanceStatus: 'known', balanceKWh: '12.5', validatedAt: '2026-11-15T08:10:49.673Z' } };
  const householdBefore = JSON.stringify(draft.equipment);
  await assert.rejects(draft.storeScenario(input), /Premium/);
  assert.ok(!text(screen(load('src/app/scenarios.tsx').default)).includes('Mes scénarios'));
  draft.setTestPremium(true); await settle();
  const firstWrite = draft.storeScenario(input);
  await assert.rejects(draft.storeScenario(input), /déjà en cours/);
  const first = await firstWrite; await settle();
  assert.equal(draft.scenarios.length, 1);
  input.simulated[0].hours = '12'; input.reference[0].name = 'Changed outside';
  assert.equal(draft.scenarios[0].simulated[0].hours, '4');
  assert.notEqual(draft.scenarios[0].reference[0].name, input.reference[0].name);
  assert.ok(Math.abs(savedTools.scenarioTotals(first).comparison.month - 5.4) < 1e-10);
  assert.equal(savedTools.householdChanged(first, [{ ...fan, hours: '2' }], ['fan']), true);
  const originalDate = first.createdAt;
  const renamed = await draft.storeScenario({ ...first, name: 'Nouveau nom' }, first.id); await settle();
  assert.equal(renamed.id, first.id); assert.equal(renamed.createdAt, originalDate); assert.equal(draft.scenarios[0].name, 'Nouveau nom');
  const changed = await draft.storeScenario({ ...renamed, simulated: [{ ...fan, hours: '12' }] }, renamed.id); await settle();
  assert.ok(savedTools.scenarioTotals(changed).comparison.month < 0, 'A rise must remain a rise');
  const copy = await draft.storeScenario({ ...changed, name: 'Copie' }); await settle();
  assert.notEqual(copy.id, first.id); assert.equal(draft.scenarios.length, 2);
  const persistedScenarios = JSON.stringify(draft.scenarios);
  failWrite = true;
  await assert.rejects(draft.storeScenario({ ...copy, name: 'À réessayer' }, copy.id));
  assert.equal(JSON.stringify(draft.scenarios), persistedScenarios);
  await assert.rejects(draft.deleteScenario(copy.id));
  assert.equal(JSON.stringify(draft.scenarios), persistedScenarios);
  failWrite = false;
  await draft.storeScenario({ ...copy, name: 'À réessayer' }, copy.id); await settle();
  assert.equal(draft.scenarios.find(s => s.id === copy.id).name, 'À réessayer');
  await assert.rejects(draft.storeScenario({ ...copy, name: ' ' }));
  await assert.rejects(draft.storeScenario({ ...copy, simulated: [{ ...fan, hours: '25' }] }));
  await assert.rejects(draft.storeScenario({ ...copy, reference: [{}] }));
  assert.equal(JSON.stringify(draft.equipment), householdBefore);
  const snapshotBeforeRestart = JSON.stringify(draft.scenarios);
  hooks = []; renderProvider(); await settle();
  assert.equal(JSON.stringify(draft.scenarios), snapshotBeforeRestart);
  assert.equal(draft.access.premium, false, 'Saved scenarios never grant Premium');
  await assert.rejects(draft.deleteScenario(copy.id), /Premium/);
  draft.setTestPremium(true); await settle();
  await draft.deleteScenario(copy.id); await settle(); assert.equal(draft.scenarios.length, 1);
  const legacy = { ...JSON.parse(stored), version: 1 }; delete legacy.scenarios;
  const migrated = storage.decodeDraft(JSON.stringify(legacy));
  assert.equal(migrated.version, 2); assert.deepEqual(migrated.scenarios, []);
  assert.deepEqual(migrated.equipment, legacy.equipment); assert.deepEqual(migrated.snapshot, legacy.snapshot);
  const corrupt = { ...JSON.parse(stored), scenarios: [{ ...first, simulated: [{}] }] };
  assert.throws(() => storage.decodeDraft(JSON.stringify(corrupt)));
  for (const reading of [{ balanceStatus: 'unknown' }, { balanceStatus: 'known', balanceKWh: '0', validatedAt: first.reading.validatedAt }]) {
    const zero = savedTools.saveScenario({ ...first, reading, simulated: [{ ...fan, hours: '0' }] });
    assert.equal(savedTools.scenarioTotals(zero).simulated.total, 0);
  }
  console.log('Saved scenarios: create/update/copy/rename/delete, serialized double taps, write failure/retry, restart, v1 migration, invalid input, unchanged reference, changed household and Premium guards passed.');
  }

  // Absolute balance updates share the confirmed write queue and never rewrite
  // the first free snapshot or the reading stored inside saved scenarios.
  {
    const readingTools = load('src/utils/balance-reading.ts');
    const setupTools = load('src/utils/setup-params.ts');
    const beforeEquipment = JSON.stringify(draft.equipment);
    const beforeScenarios = JSON.stringify(draft.scenarios);
    const beforeSnapshot = JSON.stringify(draft.snapshot);
    const input = { balance: '30,5', date: '14/11/2026', time: '08:23' };
    assert.deepEqual(readingTools.readingClock(new Date(2026, 10, 16, 9, 7)), { date: '16/11/2026', time: '09:07' });
    for (const balance of ['', ' ', '-1', 'abc', 'NaN', 'Infinity', '1e309', '12,3,4', '9'.repeat(400)]) {
      const before = stored;
      await assert.rejects(draft.updateBalance({ ...input, balance }), /solde positif/);
      assert.equal(stored, before);
    }
    for (const bad of [{ date: '31/02/2026' }, { date: '29/02/2025' }, { date: '2026-11-14' }, { time: '24:00' }, { time: '12:60' }, { time: 'abc' }]) {
      await assert.rejects(draft.updateBalance({ ...input, ...bad }), /date|heure/);
    }
    const priorSetup = JSON.stringify(draft.setup), priorStored = stored;
    let release;
    writeGate = new Promise(resolve => { release = resolve; });
    const pending = draft.updateBalance(input);
    await tick(); renderProvider();
    assert.equal(JSON.stringify(draft.setup), priorSetup, 'Do not publish before durable confirmation');
    assert.equal(stored, priorStored);
    await assert.rejects(draft.updateBalance(input), /déjà en cours/);
    failWrite = true; release();
    await assert.rejects(pending, /saisie est conservée/);
    writeGate = null; failWrite = false;
    await settle();
    assert.equal(JSON.stringify(draft.setup), priorSetup);
    assert.equal(stored, priorStored);
    for (const [balance, expected] of [['30,5', 30.5], ['5.25', 5.25], ['0', 0], ['.5', 0.5], ['12,5', 12.5]]) {
      const params = await draft.updateBalance({ ...input, balance });
      assert.equal(setupTools.readBalance(params).kWh, expected, 'Replace absolute balance; never add a delta');
      assert.equal(setupTools.readBalance(JSON.parse(stored).setup).kWh, expected);
      await settle();
      assert.equal(draft.balanceInput, balance);
      assert.equal(draft.setup.validatedAt, new Date(2026, 10, 14, 8, 23).toISOString());
      assert.equal(JSON.stringify(draft.equipment), beforeEquipment);
      assert.equal(JSON.stringify(draft.scenarios), beforeScenarios);
      assert.equal(JSON.stringify(draft.snapshot), beforeSnapshot);
      const currentResult = storage.createSnapshot(draft.equipment, draft.selected, draft.setup);
      assert.equal(currentResult.autonomy, expected === 0 ? 0 : expected / currentResult.total);
    }
    // A scenario queued behind the balance commit must preserve the new reading
    // in the household and its own older reading inside the scenario.
    writeGate = new Promise(resolve => { release = resolve; });
    const update = draft.updateBalance({ ...input, balance: '44' });
    const savedScenario = draft.scenarios[0];
    const scenarioWrite = draft.storeScenario(savedScenario, savedScenario.id);
    release(); await update; await scenarioWrite; writeGate = null; await settle();
    assert.equal(setupTools.readBalance(JSON.parse(stored).setup).kWh, 44);
    assert.deepEqual(draft.scenarios[0].reading, savedScenario.reading);
    assert.equal(JSON.stringify(draft.snapshot), beforeSnapshot);
    hooks = []; renderProvider(); await settle();
    assert.equal(draft.access.premium, false);
    assert.equal(setupTools.readBalance(draft.setup).kWh, 44);
    assert.equal(JSON.stringify(draft.equipment), beforeEquipment);
    assert.equal(JSON.stringify(draft.snapshot), beforeSnapshot);
    const lockedStored = stored;
    await assert.rejects(draft.updateBalance(input), /Premium/);
    assert.equal(stored, lockedStored);
    assert.equal(screen(load('src/app/nouveau-solde.tsx').default).type.name, 'PremiumScreen');
    console.log('Balance update: hydration/Premium guards, absolute higher/lower/zero/decimal readings, invalid dates/values, confirmed writes, double-submit, failure/retry, shared scenario queue, immutable free snapshot/equipment/scenario reading and restart passed.');
  }

  // Production build semantics: even an explicit method call cannot enable test access.
  {
    const provider = draft;
    const before = stored;
    draft = { ...provider, ready: false, access: { premium: true } };
    const Route = load('src/app/nouveau-solde.tsx').default;
    assert.equal(screen(Route), null);
    let submissions = [], rejectSave = true, releaseSave;
    draft = { ...provider, access: { premium: true }, updateBalance: async input => {
      submissions.push(input);
      if (rejectSave) throw new Error('Échec de sauvegarde ; réessayez.');
      await new Promise(resolve => { releaseSave = resolve; });
      return { ...provider.setup, ...load('src/utils/balance-reading.ts').readingParams(input) };
    } };
    const Form = screen(Route).type;
    let formHooks = [];
    function form() { const outer = hooks; hooks = formHooks; cursor = 0; const tree = Form(); hooks = outer; return tree; }
    function button(tree, label) { const node = nodes(tree).find(n => n.props.label === label || n.props.accessibilityRole === 'button' && text(n) === label); assert.ok(node, label); return node; }
    let tree = form();
    assert.ok(!text(tree).includes('pas seulement les kWh achetés'));
    button(tree, 'Quel solde saisir ? ⌄').props.onPress();
    assert.ok(text(form()).includes('pas seulement les kWh achetés'));
    button(form(), '‹ Annuler').props.onPress();
    assert.equal(routeCalls.at(-1), 'back'); assert.equal(stored, before);
    const fields = [['Solde actuel (kWh)', '8,5'], ['Date du relevé (JJ/MM/AAAA)', '14/11/2026'], ['Heure du relevé (HH:mm)', '06:30']];
    for (const [label, value] of fields) nodes(form()).find(n => n.props.accessibilityLabel === label).props.onChangeText(value);
    const beforeRoutes = routeCalls.length;
    await button(form(), 'Enregistrer et recalculer').props.onPress();
    assert.equal(routeCalls.length, beforeRoutes);
    assert.ok(text(form()).includes('réessayez'));
    for (const [label, value] of fields) assert.equal(nodes(form()).find(n => n.props.accessibilityLabel === label).props.value, value);
    rejectSave = false;
    const oldButton = button(form(), 'Enregistrer et recalculer');
    const first = oldButton.props.onPress(); await oldButton.props.onPress();
    assert.equal(submissions.length, 2, 'Only one retry, even with a stale button double tap');
    assert.ok(text(form()).includes('Enregistrement…'));
    assert.equal(nodes(form()).find(n => n.props.accessibilityLabel === 'Solde actuel (kWh)').props.editable, false);
    button(form(), '‹ Annuler').props.onPress();
    assert.equal(routeCalls.length, beforeRoutes);
    releaseSave(); await first;
    assert.equal(routeCalls.at(-1).pathname, '/tableau-de-bord');
    assert.equal(routeCalls.at(-1).params.balanceKWh, '8.5');
    assert.equal(stored, before, 'Form edits and cancellation never write directly');
    draft = provider;
    console.log('Balance form: restoration gate, help disclosure, cancellation, retained input on failure, retry, pending lock and navigation only after confirmation passed.');
  }

  // Production build semantics: even an explicit method call cannot enable test access.
  development = false; cache.clear(); hooks = [];
  renderProvider(); await settle(); draft.setTestPremium(true); await settle();
  assert.equal(draft.access.premium, false);
  await assert.rejects(draft.updateBalance({ balance: '12', date: '15/11/2026', time: '08:10' }), /Premium/);
  assert.ok(!text(screen(load('src/app/premium.tsx').default)).includes('Développement uniquement'));
  const beforeProfile = JSON.parse(stored);
  draft.updateProfile({ firstName: 'Awa', avatar: '🌿', balanceKWh: '999', premium: true }); await settle();
  const afterProfile = JSON.parse(stored);
  for (const key of ['snapshot', 'equipment', 'scenarios', 'balanceInput']) assert.deepEqual(afterProfile[key], beforeProfile[key], `Profile preserves ${key}`);
  hooks = []; await settle();
  assert.equal(draft.setup.firstName, 'Awa'); assert.equal(draft.setup.avatar, '🌿');
  assert.equal(draft.setup.balanceKWh, beforeProfile.setup.balanceKWh);
  assert.equal('premium' in draft.setup, false, 'Profile mutation accepts only its own fields');
  assert.equal(draft.access.premium, false);
  const stableProvider = draft;
  const writeCountBeforeNavigation = writes.length;
  draft = { ...draft, ready: false };
  assert.equal(screen(load('src/app/economies.tsx').default), null, 'No redirect or simulator before restoration');
  draft = stableProvider; params = { premium: 'true', testPremium: 'true', scenarioId: 'arbitrary' };
  assert.equal(screen(load('src/app/economies.tsx').default).props.href, '/premium');
  const navigation = screen(load('src/components/main-navigation.tsx').MainNavigation);
  const tabs = nodes(navigation).filter(n => n.props.accessibilityRole === 'tab');
  assert.equal(tabs.length, 4);
  tabs.find(n => text(n) === 'Simulation').props.onPress();
  assert.equal(routeCalls.at(-1), '/premium');
  tabs.find(n => text(n) === 'Mon solde').props.onPress();
  assert.equal(routeCalls.at(-1), '/mon-solde');
  const balancePage = screen(load('src/app/mon-solde.tsx').default);
  nodes(balancePage).find(n => n.props.label === 'Mettre à jour mon solde').props.onPress();
  assert.equal(routeCalls.at(-1), '/premium');
  assert.equal(writes.length, writeCountBeforeNavigation);
  assert.equal(draft.access.premium, false);
  console.log('New interface: four destinations, free Simulation/balance gates, URL entitlement rejection, restoration wait and durable optional profile without household/scenario mutation passed.');
  console.log('Offers/persistence: hydration-before-write, corrections, immutable snapshot, direct-route/action guards, illustrative/personal simulator access, Premium return, durable restart, zero/unknown, timestamps, stable IDs, read/write retry and no production test entitlement passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
