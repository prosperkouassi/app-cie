/* global __dirname, setImmediate */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
let hooks = [], cursor = 0, effects = [], providerHooks = [], pageHooks = [], intro;
let params = {}, reduced = false, backAvailable = false, failRead = false, failWrite = false;
let restoredDraft = { setup: {}, resumeRoute: '/', snapshot: null };
const store = new Map(), calls = [], writes = [];
const element = (type, props) => ['Action', 'WelcomeLayout'].includes(type?.name) ? type(props) : ({ type, props: props || {} });
const router = { back: () => calls.push('back'), replace: (route) => calls.push(route), push: (route) => calls.push(route), canGoBack: () => backAvailable };
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  if (relative.endsWith('.json')) return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  function requireMock(name) {
    if (name.endsWith('.svg')) return name;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '@/components/home-summary') return { HomeHeader: 'HomeHeader', HomeEquipment: 'HomeEquipment', BalanceHero: 'BalanceHero' };
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      createContext: () => ({ Provider: 'Provider' }), useContext: () => intro,
      useCallback: (fn) => fn,
      useState(initial) { const i = cursor++; const state = hooks; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
      useRef(initial) { const i = cursor++; return hooks[i] ?? (hooks[i] = { current: initial }); },
      useEffect(fn, deps) { const i = cursor++; if (!hooks[i] || deps.some((v, j) => v !== hooks[i][j])) { hooks[i] = deps; effects.push(fn); } },
    };
    if (name === '@react-native-async-storage/async-storage') return { getItem: async (key) => { if (failRead) throw Error('read'); return store.get(key) ?? null; }, setItem: async (key, value) => { if (failWrite) throw Error('write'); writes.push(key); store.set(key, value); } };
    if (name === '@/components/setup-draft') return { useSetupDraft: () => restoredDraft };
    if (name === 'expo-router') return { router, useLocalSearchParams: () => params };
    if (name === 'react-native') return new Proxy({ StyleSheet: { create: (s) => s }, Platform: { OS: 'ios' }, AccessibilityInfo: { announceForAccessibility() {} } }, { get: (o, k) => o[k] || k });
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@/hooks/use-reduced-motion') return { useReducedMotion: () => reduced };
    if (name === '@/components/welcome-animation') return { WelcomeAnimation: 'WelcomeAnimation' };
    if (name === 'lottie-react-native') return 'LottieView';
    let base = name.startsWith('@/assets/') ? name.replace('@/', '') : name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(relative), name);
    if (!path.extname(base)) base += fs.existsSync(path.join(root, base + '.tsx')) ? '.tsx' : '.ts';
    return load(base);
  }
  new Function('require', 'module', 'exports', code)(requireMock, module, module.exports);
  cache.set(relative, module.exports); return module.exports;
}
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)] : []; }
function text(tree) { return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree && typeof tree === 'object' ? [tree.props?.children].flat(Infinity).map(text).join('') : ''; }
function button(tree, label) { const found = nodes(tree).find((n) => n.props.accessibilityRole === 'button' && text(n) === label); assert.ok(found, label); return found; }
function provider() { hooks = providerHooks; cursor = 0; effects = []; intro = load('src/components/introduction-provider.tsx').IntroductionProvider({}).props.value; effects.forEach((effect) => effect()); }
function page() { hooks = pageHooks; cursor = 0; return load('src/app/bienvenue.tsx').default(); }
const tick = () => new Promise((r) => setImmediate(r));
async function restore() { provider(); await tick(); provider(); }

(async () => {
  const utils = load('src/utils/introduction.ts');
  assert.equal(utils.decodeIntroduction(null), false);
  assert.equal(utils.decodeIntroduction('{"version":1,"seen":true}'), true);
  assert.throws(() => utils.decodeIntroduction('{"version":2,"seen":true}'));
  assert.throws(() => utils.decodeIntroduction('{"version":1,"seen":"yes"}'));
  const empty = { version: 1, setup: {}, selected: [], equipment: [], balanceInput: null, resumeRoute: '/', snapshot: null };
  assert.equal(utils.hasStartedJourney(empty), false);
  for (const partial of [{ setup: { homeName: 'Mon foyer' } }, { selected: ['fan'] }, { equipment: [{}] }, { balanceInput: '0' }, { resumeRoute: '/solde' }, { snapshot: {} }]) assert.equal(utils.hasStartedJourney({ ...empty, ...partial }), true);
  assert.equal(utils.shouldIntroduce(false, false, false), false);
  assert.equal(utils.shouldIntroduce(true, false, false), true);
  assert.equal(utils.shouldIntroduce(true, true, false), false);
  assert.equal(utils.shouldIntroduce(true, false, true), false);

  store.set('app-cie:draft', JSON.stringify({ ...empty, setup: { homeName: 'Foyer conservé', validatedAt: '2026-11-14T10:23:00.000Z' } }));
  const baseline = store.get('app-cie:draft');
  provider(); assert.equal(intro.ready, false); assert.equal(writes.length, 0);
  await tick(); provider(); assert.equal(intro.ready, true); assert.equal(intro.seen, false);
  assert.equal(writes.length, 0, 'Restoration never writes an initial unseen value');
  let tree = page(); assert.ok(text(tree).includes('Comprenez votre consommation'));
  assert.equal(nodes(tree).filter((n) => n.props.accessibilityLabel?.startsWith('Étape ')).length, 1);
  assert.ok(!text(tree).includes('Étape 1 sur 3'), 'Progress is announced accessibly without duplicate visible step text');
  assert.ok(nodes(tree).filter((n) => n.props.accessibilityLabel?.startsWith('Étape ')).every((n) => n.props.accessibilityRole === 'image'));
  button(tree, 'Suivant').props.onPress(); tree = page(); assert.ok(text(tree).includes('Estimez votre autonomie'));
  button(tree, '‹ Retour').props.onPress(); tree = page(); assert.ok(text(tree).includes('Comprenez votre consommation'));
  button(tree, 'Suivant').props.onPress(); tree = page(); button(tree, 'Suivant').props.onPress(); tree = page();
  assert.ok(text(tree).includes('Explorez vos économies')); assert.ok(text(tree).includes('Découvrir Premium'));
  await button(tree, 'Commencer').props.onPress(); provider();
  assert.deepEqual(calls.at(-1), { pathname: '/', params: { start: 'true' } }); assert.equal(intro.seen, true);
  assert.deepEqual(JSON.parse(store.get(utils.INTRODUCTION_KEY)), { version: 1, seen: true });
  assert.equal(store.get('app-cie:draft'), baseline);
  providerHooks = []; await restore(); assert.equal(intro.seen, true);

  pageHooks = []; params = { mode: 'replay' }; backAvailable = true;
  tree = page(); await button(tree, 'Passer').props.onPress(); provider();
  assert.equal(calls.at(-1), 'back'); assert.equal(store.get('app-cie:draft'), baseline);
  assert.equal(intro.seen, true);
  // Skip works on every step and uses the same versioned completion path.
  for (let index = 0; index < 3; index++) {
    pageHooks = []; tree = page(); for (let i = 0; i < index; i++) { button(tree, 'Suivant').props.onPress(); tree = page(); }
    await button(tree, 'Passer').props.onPress(); assert.equal(calls.at(-1), 'back');
  }

  pageHooks = []; params = {}; backAvailable = false; failWrite = true;
  tree = page(); const before = calls.length;
  await button(tree, 'Passer').props.onPress(); provider(); tree = page();
  assert.equal(calls.length, before); assert.ok(text(tree).includes('n’a pas pu être mémorisée'));
  assert.equal(intro.seen, true, 'Failure fallback stays seen in this session');
  button(tree, 'Continuer sans enregistrer').props.onPress(); assert.deepEqual(calls.at(-1), { pathname: '/', params: { start: 'true' } });
  failWrite = false; await button(tree, 'Réessayer l’enregistrement').props.onPress(); provider(); assert.equal(intro.error, null);
  failRead = true; providerHooks = []; await restore(); assert.equal(intro.ready, true); assert.ok(intro.error);
  assert.equal(store.get('app-cie:draft'), baseline); failRead = false;

  reduced = true; pageHooks = []; tree = page();
  assert.equal(nodes(tree).find((n) => n.type === 'WelcomeAnimation').props.reduced, true);
  hooks = []; cursor = 0;
  const NativeAnimation = load('src/components/welcome-animation.tsx').WelcomeAnimation;
  const still = NativeAnimation({ page: 0, reduced: true });
  const player = nodes(still).find((n) => n.type === 'LottieView');
  assert.equal(player.props.autoPlay, false); assert.equal(player.props.progress, 0); assert.equal(player.props.loop, false);
  assert.equal(still.props.accessibilityElementsHidden, true);
  for (const file of ['home', 'energy', 'comparison']) {
    const data = load(`assets/animations/welcome/${file}.json`);
    assert.equal(data.assets.length, 0, 'No remote images/fonts'); assert.equal(data.fr, 30); assert.equal(data.op, 120);
    assert.ok(data.layers.length > 0); assert.ok(fs.statSync(path.join(root, `assets/animations/welcome/${file}.json`)).size < 15000);
    assert.ok(!JSON.stringify(data).includes('http')); assert.equal(data.meta.license, 'MIT');
  }
  assert.ok(writes.every((key) => key === utils.INTRODUCTION_KEY));
  restoredDraft = { setup: { homeName: 'Foyer conservé' }, resumeRoute: '/configuration-appareils', snapshot: { total: 1 } };
  pageHooks = []; params = { mode: 'replay' }; tree = page();
  for (let i = 0; i < 2; i++) { button(tree, 'Suivant').props.onPress(); tree = page(); }
  await button(tree, 'Commencer').props.onPress();
  assert.equal(calls.at(-1), '/tableau-de-bord', 'Commencer opens the configured home even during replay');
  restoredDraft = { ...restoredDraft, snapshot: null };
  pageHooks = []; tree = page();
  for (let i = 0; i < 2; i++) { button(tree, 'Suivant').props.onPress(); tree = page(); }
  await button(tree, 'Commencer').props.onPress();
  assert.equal(calls.at(-1).pathname, '/configuration-appareils', 'Commencer resumes unfinished setup');
  assert.equal(store.get('app-cie:draft'), baseline);
  console.log('Introduction: fresh/started/restored routing, 3 steps/back/skip/finish, independent versioned status, replay return, no household writes, storage failure/retry/continue, static reduced motion and local Lottie assets passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
