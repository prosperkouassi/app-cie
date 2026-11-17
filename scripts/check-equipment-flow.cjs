// Run with node scripts/check-equipment-flow.cjs. No device or Expo server required.
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
global.__DEV__ = true;

const root = path.resolve(__dirname, '..');
let params = {};
let calls = [];
let state = [];
let cursor = 0;
let draft;
let configurationState = [];
let dashboardState = [];
let captureEffects = false;
let effects = [];
const router = {
  dismissTo: (route) => calls.push(route),
  push: (route) => calls.push(route),
  replace: (route) => calls.push(route),
  back: () => calls.push('back'),
  canGoBack: () => true,
};
const element = (type, props) => ['Action', 'PersonalEconomiesScreen', 'BalanceHero'].includes(type?.name) ? type(props) : ({ type, props: props || {} });
const native = new Proxy({
  StyleSheet: { create: (styles) => styles },
  Platform: { OS: 'ios' },
  useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
  Keyboard: { dismiss() {} },
}, { get: (target, key) => target[key] || key });
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative);
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  function requireMock(name) {
    if (name.endsWith('.svg')) return name;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '@/components/home-summary') return { HomeHeader: 'HomeHeader', HomeEquipment: 'HomeEquipment', BalanceHero: (props) => element('Text', { ...props, children: [props.duration, load('src/utils/dashboard.ts').formatReadingDate(props.date)] }) };
    if (name === '@react-native-async-storage/async-storage') return { getItem: async () => null, setItem: async () => {} };
    if (name === '@/hooks/use-draft-params') return { useDraftParams: () => params };
    if (name === '@/components/access-gate') return { withSetupAccess: (screen) => screen };
    if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
    if (name === 'react') return {
      createContext: () => ({ Provider: 'Provider' }),
      useCallback: (callback) => callback,
      useEffect: (effect) => { if (captureEffects) effects.push(effect); },
      useRef(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = { current: initial };
        return state[index];
      },
      useState(initial) {
      const index = cursor++;
      const hookState = state;
      if (!(index in hookState)) hookState[index] = typeof initial === 'function' ? initial() : initial;
      return [hookState[index], (value) => { hookState[index] = typeof value === 'function' ? value(hookState[index]) : value; }];
    } };
    if (name === 'expo-router') return { router, useLocalSearchParams: () => params };
    if (name === 'react-native') return native;
    if (name === 'expo-status-bar') return { StatusBar: 'StatusBar' };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === '@/components/setup-draft') return { useSetupDraft: () => draft };
    if (name.startsWith('.')) {
      const base = path.join(path.dirname(relative), name);
      return load(fs.existsSync(path.join(root, `${base}.tsx`)) ? `${base}.tsx` : `${base}.ts`);
    }
    if (name.startsWith('@/')) {
      const base = name.replace('@/', 'src/');
      return load(fs.existsSync(path.join(root, `${base}.tsx`)) ? `${base}.tsx` : `${base}.ts`);
    }
    throw new Error(`Unexpected import: ${name}`);
  }
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  cache.set(relative, module.exports);
  return module.exports;
}
function render(screen) {
  const outerState = state;
  const config = screen.name === 'ConfigurationAppareilsScreen';
  const dashboard = screen.name === 'TableauDeBordScreen';
  if (dashboard) state = dashboardState;
  if (config) state = configurationState;
  cursor = 0;
  const tree = screen();
  if (config) { configurationState = state; state = outerState; }
  if (dashboard) { dashboardState = state; state = outerState; }
  return tree;
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function text(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!tree || typeof tree !== 'object') return '';
  return [tree?.props?.children].flat(Infinity).map(text).join('');
}
function button(tree, label) {
  const found = nodes(tree).find((node) => node.props.accessibilityRole === 'button' && text(node) === label);
  assert.ok(found, `Button missing: ${label}`);
  return found;
}
function estimateButton(tree) {
  const found = nodes(tree).find((node) => node.props.accessibilityRole === 'button' &&
    ['Voir mon estimation', 'Utiliser ces profils estimatifs et voir mon estimation'].includes(text(node)));
  assert.ok(found, 'Estimation action missing');
  return found;
}
function reset() {
  params = { homeName: 'Foyer test', commune: 'Cocody', category: 'social', amperage: '5' };
  state = []; calls = []; configurationState = []; dashboardState = []; effects = [];
  draft = {
    setup: {}, setSetup() {}, ready: true, access: { premium: true, discoveryComplete: false }, finalizeDiscovery: () => true,
    balanceInput: null, selected: [], equipment: [], scenarios: [],
    setBalanceInput(value) { draft.balanceInput = value; },
    setSelected(value) { draft.selected = typeof value === 'function' ? value(draft.selected) : value; },
    setEquipment(value) { draft.equipment = typeof value === 'function' ? value(draft.equipment) : value; },
    addEquipment(type) { draft.equipment.push(engine.createEquipment(`test-${++nextId}`, type)); },
    ensureEquipment(types) {
      const helpers = load('src/utils/quick-equipment.ts');
      draft.equipment = helpers.ensureFirstEquipment(draft.equipment,
        types.map((type) => helpers.createQuickEquipment(`equipment-${++nextId}`, type)));
    },
  };
}
const utils = load('src/utils/setup-params.ts');
const engine = load('src/utils/consumption.ts');
let nextId = 0;
const Solde = load('src/app/solde.tsx').default;
const Appareils = load('src/app/appareils.tsx').default;
const Configuration = load('src/app/configuration-appareils.tsx').default;
const { EquipmentStep } = load('src/components/equipment-step.tsx');

for (const [input, expected] of [['12,5', 12.5], ['0', 0], ['0.0', 0]]) {
  reset(); draft.balanceInput = input;
  button(render(Solde), 'Je valide mon solde').props.onPress();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, '/appareils');
  const next = calls[0].params;
  assert.equal(utils.readBalance(next).kWh, expected);
  assert.ok(Number.isFinite(Date.parse(next.validatedAt)));
  assert.equal(next.homeName, params.homeName);
  assert.equal(next.commune, params.commune);
  assert.equal(next.category, params.category);
  assert.equal(next.amperage, params.amperage);
}
for (const input of ['', ' ', '-1', 'abc', '12,3,4', 'Infinity', '0x10', '1e3']) {
  reset(); draft.balanceInput = input;
  button(render(Solde), 'Je valide mon solde').props.onPress();
  assert.equal(calls.length, 0);
  assert.ok(nodes(render(Solde)).some((node) => node.props.accessibilityRole === 'alert' && text(node).includes('positif ou nul')));
}
reset(); draft.balanceInput = 'saisie à conserver';
button(render(Solde), 'Je le renseignerai plus tard').props.onPress();
params = calls[0].params;
assert.equal(params.balanceStatus, 'unknown');
assert.equal('validatedAt' in params, false);
assert.equal('balanceKWh' in params, false);
assert.deepEqual(utils.readBalance(params), { kWh: null, validatedAt: null });
state = [];
let householdTree = render(() => EquipmentStep({ params }));
assert.ok(!text(householdTree).includes('solde inconnu'));
nodes(householdTree).find(node => node.props.accessibilityState?.expanded === false).props.onPress();
householdTree = render(() => EquipmentStep({ params }));
assert.ok(text(householdTree).includes('solde inconnu'));
let tree = render(Appareils);
assert.equal(nodes(tree).filter((node) => node.props.accessibilityRole === 'checkbox').length, 10);
assert.equal(draft.selected.length, 0);
assert.equal(button(tree, 'Configurer mes appareils').props.disabled, true);
button(tree, 'Configurer mes appareils').props.onPress();
assert.equal(calls.length, 1);
function toggle(label) {
  nodes(render(Appareils)).find((node) => node.props.accessibilityLabel === label).props.onPress();
}
toggle('Réfrigérateur'); toggle('Télévision'); toggle('Télévision');
assert.deepEqual(draft.selected, ['fridge']);
render(Appareils).props.onBack();
assert.equal(calls.at(-1), 'back');
assert.equal(nodes(render(Solde)).find((node) => node.type === 'TextInput').props.value, 'saisie à conserver');
assert.deepEqual(draft.selected, ['fridge']);
button(render(Appareils), 'Configurer mes appareils').props.onPress();
assert.equal(calls.at(-1).pathname, '/configuration-appareils');
params = calls.at(-1).params;
assert.equal(params.appliances, 'fridge');
assert.ok(text(render(Configuration)).includes('Réfrigérateur'));
assert.ok(!text(render(Configuration)).includes('Télévision'));
render(Configuration).props.onBack();
assert.equal(calls.at(-1), 'back');
assert.deepEqual(draft.selected, ['fridge']);

reset();
params = { ...params, ...utils.balanceParams({ kWh: 0, validatedAt: '2026-11-14T10:00:00.000Z' }) };
assert.equal(nodes(render(Solde)).find((node) => node.type === 'TextInput').props.value, '0');
state = [];
householdTree = render(() => EquipmentStep({ params }));
nodes(householdTree).find(node => node.props.accessibilityState?.expanded === false).props.onPress();
assert.ok(text(render(() => EquipmentStep({ params }))).includes('Solde au relevé : 0 kWh'));
for (const bad of [{ balanceKWh: '-1' }, { balanceKWh: ['0', '1'] }, { validatedAt: 'bad' }, { balanceStatus: 'unknown' }]) {
  assert.equal(utils.readBalance({ ...params, ...bad }).kWh, null);
}
assert.deepEqual(utils.readAppliances('fridge,invalid,fridge,tv'), ['fridge', 'tv']);
assert.deepEqual(utils.readAppliances(['fridge', 'tv']), []);
console.log('Equipment flow: valid/zero/unknown/invalid balances, parameter validation, selection and back navigation passed.');

// Reference values live only in tests, never in the production draft.
function record(type, fields) {
  return { ...engine.createEquipment(`reference-${++nextId}`, type), name: type, quantity: '1', ...fields };
}
function near(actual, expected) {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`);
}
const references = [
  record('air-conditioner', { name: 'Clim chambre', watts: '1000', hours: '12', days: '7', percent: '60' }),
  record('fridge', { name: 'Réfrigérateur', daily: '1,2' }),
  record('fan', { name: 'Ventilateurs', quantity: '2', watts: '60', hours: '8', days: '7' }),
  record('tv', { name: 'Télévision', watts: '100', hours: '4', days: '7' }),
  record('lighting', { name: 'LED', quantity: '6', watts: '8', hours: '5', days: '7' }),
];
references.forEach((item, index) => near(engine.estimateEquipment(item).daily, [7.2, 1.2, 0.96, 0.4, 0.24][index]));
const selectedTypes = references.map((item) => item.type);
const referenceInventory = engine.estimateInventory(references, selectedTypes);
near(referenceInventory.total, 10);
near(engine.autonomyDays(120, referenceInventory.total), 12);
const cycle = record('washing-machine', { perCycle: '0,8', cycles: '3', quantity: '2' });
near(engine.estimateEquipment(cycle).daily, 2 * 0.8 * 3 / 7);
const annual = record('freezer', { mode: 'annual', annual: '438' });
near(engine.estimateEquipment(annual).daily, 1.2);
near(engine.estimateEquipment({ ...references[2], days: '3,5' }).daily, 0.48);
for (const type of ['fridge', 'freezer']) assert.equal(engine.createEquipment('blank', type).mode, 'daily');
const blank = engine.createEquipment('blank', 'fan');
for (const field of ['quantity', 'watts', 'hours', 'days', 'percent', 'perCycle', 'cycles', 'daily', 'annual']) assert.equal(blank[field], '');
assert.equal(engine.estimateEquipment(blank).daily, null);

for (const [field, invalid] of [
  ['quantity', '0'], ['quantity', '-1'], ['quantity', '1,5'], ['quantity', '9007199254740992'],
  ['hours', '24.1'], ['days', '7.1'], ['percent', '100.1'], ['percent', '-1'],
  ['watts', '-1'], ['watts', 'NaN'], ['watts', 'Infinity'], ['watts', ''], ['hours', ' '],
]) {
  const result = engine.estimateEquipment({ ...references[0], [field]: invalid });
  assert.equal(result.daily, null, `${field}=${invalid} must not be zero`);
  assert.ok(result.errors[field], `Missing field error: ${field}`);
}
for (const [source, field] of [[cycle, 'perCycle'], [cycle, 'cycles'], [annual, 'annual'], [references[1], 'daily']]) {
  for (const invalid of ['', '-2', 'Infinity', 'abc', '1,2,3']) {
    const result = engine.estimateEquipment({ ...source, [field]: invalid });
    assert.equal(result.daily, null);
    assert.ok(result.errors[field]);
  }
}
for (const field of ['watts', 'hours', 'days', 'percent']) near(engine.estimateEquipment({ ...references[0], [field]: '0' }).daily, 0);
near(engine.estimateEquipment({ ...references[0], percent: '100', hours: '24' }).daily, 24);
near(engine.estimateEquipment({ ...references[2], percent: 'invalid' }).daily, 0.96); // Constant use requires no coefficient.
assert.equal(engine.estimateEquipment({ ...references[0], name: ' ' }).daily, null);
assert.equal(engine.estimateInventory([...references, blank], selectedTypes).total, null);
assert.equal(engine.estimateInventory(references, [...selectedTypes, 'iron']).total, null);
assert.equal(engine.estimateInventory([], []).total, null);
assert.equal(engine.estimateEquipment(record('other', { mode: 'daily', quantity: '2', daily: '9'.repeat(308) })).daily, null);
const huge = record('other', { mode: 'daily', daily: '9'.repeat(307) });
assert.equal(engine.estimateInventory(Array.from({ length: 20 }, () => huge), ['other']).total, null);
assert.equal(engine.autonomyDays(null, 10), null);
assert.equal(engine.autonomyDays(0, 10), 0);
assert.equal(engine.autonomyDays(120, 0), null);
assert.equal(engine.autonomyDays(0, 0), null);
assert.equal(engine.autonomyDays(120, null), null);
assert.equal(engine.autonomyDays(Infinity, 1), null);
assert.equal(engine.autonomyDays(120, Number.MIN_VALUE), null);
assert.notEqual(engine.formatEstimate(0.00001), '0');

// UI handlers: adding distinct sheets, editing names, changing modes, deletion and navigation.
reset(); state = [];
params.appliances = 'air-conditioner'; draft.selected = ['air-conditioner'];
button(render(Configuration), '+ Ajouter une fiche · Climatiseur').props.onPress();
button(render(Configuration), '+ Ajouter une fiche · Climatiseur').props.onPress();
assert.equal(draft.equipment.length, 2);
assert.notEqual(draft.equipment[0].id, draft.equipment[1].id);
estimateButton(render(Configuration)).props.onPress();
assert.equal(calls.length, 0);
assert.ok(nodes(render(Configuration)).some((node) => node.props.accessibilityRole === 'alert'));
const { EquipmentEditor } = load('src/components/equipment-editor.tsx');
function editorElement(index) { return nodes(render(Configuration)).filter((node) => node.type === EquipmentEditor)[index]; }
function renderEditor(index = 0) {
  const props = editorElement(index).props;
  return render(() => EquipmentEditor(props));
}
state = [];
let editorTree = renderEditor();
nodes(editorTree).find(node => node.props.accessibilityLabel === 'Réglages avancés').props.onPress();
editorTree = renderEditor();
nodes(editorTree).find((node) => node.type === 'TextInput' && node.props.accessibilityLabel.startsWith('Nom —')).props.onChangeText('Clim salon');
const firstId = draft.equipment[0].id;
assert.equal(draft.equipment[0].name, 'Clim salon');
assert.equal(draft.equipment[0].id, firstId);
editorTree = renderEditor();
nodes(editorTree).find((node) => node.props.accessibilityRole === 'radio' && text(node) === 'Consommation quotidienne connue○').props.onPress();
assert.equal(draft.equipment[0].mode, 'daily');
button(editorTree, 'Supprimer cette fiche').props.onPress();
// Render the editor with its own hook state, independently of the parent screen.
const editorProps = editorElement(0).props;
state = [true, true];
button(render(() => EquipmentEditor(editorProps)), 'Conserver la fiche').props.onPress();
assert.equal(draft.equipment.length, 2);
state = [true, true];
button(render(() => EquipmentEditor(editorProps)), 'Confirmer la suppression').props.onPress();
assert.equal(draft.equipment.length, 1);
assert.ok(!draft.equipment.some((item) => item.id === firstId));

reset(); state = [];
draft.equipment = references.map((item) => ({ ...item })); draft.selected = [...selectedTypes];
params = { ...params, ...utils.balanceParams({ kWh: 120, validatedAt: '2026-11-14T10:00:00.000Z' }), appliances: selectedTypes.join(',') };
estimateButton(render(Configuration)).props.onPress();
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');
params = calls.at(-1).params;
const Dashboard = load('src/components/personal-dashboard.tsx').default;
assert.ok(text(render(Dashboard)).includes('Consommation estimée10kWh/jour'));
assert.ok(text(render(Dashboard)).includes('12 jours'));
button(render(Dashboard), 'Modifier mes appareils').props.onPress();
assert.equal(calls.at(-1).pathname, '/configuration-appareils');
assert.equal(draft.equipment[0].name, 'Clim chambre');
render(Configuration).props.onBack();
assert.deepEqual(draft.selected, selectedTypes);
toggle('Climatiseur');
params = { ...params, appliances: draft.selected.join(',') };
assert.ok(text(render(Configuration)).includes('Fiches mises de côté'));
assert.equal(draft.equipment.length, 5);
near(engine.estimateInventory(draft.equipment, draft.selected).total, 2.8);
toggle('Climatiseur');
params.appliances = draft.selected.join(',');
near(engine.estimateInventory(draft.equipment, draft.selected).total, 10);
assert.equal(draft.equipment[0].id, references[0].id);
params = { ...params, ...utils.balanceParams({ kWh: 0, validatedAt: '2026-11-14T10:00:00.000Z' }) };
assert.ok(text(render(Dashboard)).includes('Crédit épuisé au moment du relevé'));
params = { ...params, balanceStatus: 'unknown' };
assert.ok(text(render(Dashboard)).includes('Renseignez votre solde'));
params = { ...params, ...utils.balanceParams({ kWh: 120, validatedAt: '2026-11-14T10:00:00.000Z' }), appliances: 'fridge' };
draft.equipment = [record('fridge', { daily: '0' })];
assert.ok(text(render(Dashboard)).includes('Durée indéterminée'));
draft.equipment[0].daily = '';
assert.ok(text(render(Dashboard)).includes('Inventaire incomplet'));
assert.ok(!text(render(Dashboard)).includes('0 kWh/jour'));

// Actual provider state: stable IDs, deletion never reuses an ID, unrelated state preserves records.
const { SetupDraftProvider } = load('src/components/setup-draft.tsx');
state = [];
let provider = render(() => SetupDraftProvider({})).props.value;
provider.addEquipment('fridge'); provider.addEquipment('fridge');
provider = render(() => SetupDraftProvider({})).props.value;
const stableId = provider.equipment[0].id;
const deletedId = provider.equipment[1].id;
provider.setEquipment((items) => [{ ...items[0], name: 'Cuisine', daily: '1,2' }]);
provider.addEquipment('fan');
provider.setSelected(['fan']);
provider.setBalanceInput('120');
provider = render(() => SetupDraftProvider({})).props.value;
assert.equal(provider.equipment[0].id, stableId);
assert.equal(provider.equipment[0].daily, '1,2');
assert.notEqual(provider.equipment[1].id, deletedId);
provider.setSelected(['fan', 'fridge']);
provider = render(() => SetupDraftProvider({})).props.value;
assert.equal(provider.equipment[0].name, 'Cuisine');
console.log('Consumption and configuration: reference total 10 kWh/day, autonomy 12 days, all modes, validation, overflow, stable IDs, CRUD, preservation and dashboard passed.');

const quick = load('src/utils/quick-equipment.ts');
const catalogue = load('src/utils/equipment-profiles.ts');
const { QuickEquipmentControls } = load('src/components/quick-equipment-controls.tsx');
assert.equal(new Set(catalogue.EQUIPMENT_PROFILES.map((item) => item.id)).size, catalogue.EQUIPMENT_PROFILES.length);
for (const { id: type } of utils.APPLIANCES) {
  const proposal = quick.createQuickEquipment(`quick-${type}`, type);
  if (!proposal.quick) {
    assert.equal(type, 'other');
    assert.equal(proposal.daily, '');
    assert.equal(quick.estimateConfiguredInventory([proposal], [type]).complete, false);
    continue;
  }
  const profile = catalogue.findProfile(proposal.quick.profileId);
  assert.ok(profile);
  assert.equal(profile.validation, 'provisional');
  assert.ok(profile.provenance.includes('Aucune mesure'));
  assert.ok(profile.assumptions.length > 0);
  assert.equal(proposal.quantity, '1');
  assert.equal(proposal.quick.state, 'proposed');
  assert.equal(quick.valueOrigin(proposal, 'quantity'), 'proposed');
  assert.equal(quick.estimateConfiguredInventory([proposal], [type]).total, null);
  const confirmed = quick.confirmQuickEquipment(proposal);
  assert.equal(confirmed.quick.state, 'confirmed');
  assert.equal(quick.valueOrigin(confirmed, 'quantity'), 'confirmed');
  const result = quick.estimateConfiguredInventory([confirmed], [type]);
  assert.ok(result.complete, `Quick profile must be calculable: ${type}`);
  assert.ok(Number.isFinite(result.total));
  near(result.total, engine.estimateEquipment(confirmed).daily);
}

// Opening the quick UI or Affiner does not mutate legacy/custom settings.
let currentQuick = { ...references[0], name: 'Clim personnalisée', watts: '1234', percent: '43', hours: '7.5' };
function renderQuick() {
  return render(() => QuickEquipmentControls({ record: currentQuick, advanced: true, onChange: (value) => { currentQuick = value; } }));
}
state = [];
const legacySnapshot = JSON.stringify(currentQuick);
let quickTree = renderQuick();
assert.ok(text(quickTree).includes('Vos valeurs personnalisées sont conservées'));
assert.equal(JSON.stringify(currentQuick), legacySnapshot);
assert.equal(quick.valueOrigin(currentQuick, 'watts'), 'custom');
const tactileLegacy = quick.stepQuantity(currentQuick, 1);
assert.equal(quick.valueOrigin(tactileLegacy, 'quantity'), 'confirmed');
assert.equal(quick.valueOrigin(tactileLegacy, 'watts'), 'custom');
assert.equal(tactileLegacy.quick, undefined);
assert.equal(currentQuick.quantity, '1');
assert.ok(!nodes(quickTree).some((node) => node.type === 'TextInput' && node.props.accessibilityLabel.includes('Puissance')));
const alternatives = catalogue.profilesFor('air-conditioner');
button(quickTree, alternatives[1].label).props.onPress();
assert.equal(JSON.stringify(currentQuick), legacySnapshot);
quickTree = renderQuick();
assert.ok(text(quickTree).includes('Effet du changement de profil'));
assert.ok(text(quickTree).includes('remplace une valeur personnalisée'));
assert.ok(text(quickTree).includes('1234 → 1500'));
button(quickTree, 'Garder mes réglages').props.onPress();
assert.equal(JSON.stringify(currentQuick), legacySnapshot);
assert.ok(!text(renderQuick()).includes('Effet du changement de profil'));
button(renderQuick(), alternatives[1].label).props.onPress();
const expectedChange = quick.previewProfileChange(currentQuick, alternatives[1]);
button(renderQuick(), 'Confirmer le changement de profil').props.onPress();
assert.deepEqual(currentQuick, expectedChange.candidate);
assert.equal(currentQuick.id, references[0].id);
assert.equal(currentQuick.name, 'Clim personnalisée');
assert.equal(currentQuick.quantity, '1');
assert.equal(currentQuick.watts, '1500');
assert.equal(quick.valueOrigin(currentQuick, 'watts'), 'confirmed');
near(engine.estimateEquipment(currentQuick).daily, 1.5 * 8 * 0.55);
assert.throws(() => quick.previewProfileChange(currentQuick, catalogue.profilesFor('fridge')[0]));

// Rapid controls explicitly record confirmed choices vs custom numeric input.
currentQuick = quick.createQuickEquipment('equipment-quick', 'fan');
state = [];
nodes(renderQuick()).find((node) => node.props.accessibilityLabel === 'Diminuer la quantité').props.onPress();
assert.equal(currentQuick.quantity, '1');
nodes(renderQuick()).find((node) => node.props.accessibilityLabel === 'Augmenter la quantité').props.onPress();
assert.equal(currentQuick.quantity, '2');
assert.equal(quick.valueOrigin(currentQuick, 'quantity'), 'confirmed');
nodes(renderQuick()).find((node) => node.props.accessibilityLabel === 'Heures/jour : 10 h').props.onPress();
assert.equal(currentQuick.hours, '10');
assert.equal(quick.valueOrigin(currentQuick, 'hours'), 'confirmed');
// The first custom choice belongs to duration, the second to days/week.
nodes(renderQuick()).find((node) => node.props.accessibilityRole === 'button' && text(node) === 'Personnalisé').props.onPress();
nodes(renderQuick()).find((node) => node.props.accessibilityLabel === 'Heures/jour personnalisé').props.onChangeText('3,25');
assert.equal(currentQuick.hours, '3,25');
assert.equal(quick.valueOrigin(currentQuick, 'hours'), 'custom');
assert.equal(quick.estimateConfiguredInventory([currentQuick], ['fan']).complete, false);
assert.ok(!text(renderQuick()).includes('Confirmer le profil et mes choix'));
currentQuick = quick.confirmPresentedProfiles([currentQuick], quick.presentedProfiles([currentQuick], ['fan']))[0];
assert.equal(currentQuick.hours, '3,25');
assert.equal(quick.valueOrigin(currentQuick, 'hours'), 'custom');
assert.equal(quick.valueOrigin(currentQuick, 'watts'), 'confirmed');
near(quick.estimateConfiguredInventory([currentQuick], ['fan']).total, 2 * 0.045 * 3.25);
// Reopening quick mode leaves explicit overrides intact.
const customSnapshot = JSON.stringify(currentQuick);
state = []; renderQuick();
assert.equal(JSON.stringify(currentQuick), customSnapshot);
const quantityId = currentQuick.id;
currentQuick = quick.stepQuantity(currentQuick, -1);
assert.equal(currentQuick.quantity, '1');
assert.equal(currentQuick.id, quantityId);

// Technical modifications retain provenance and survive proposed-profile confirmation.
currentQuick = quick.createQuickEquipment('technical', 'air-conditioner');
currentQuick = quick.editEquipment(currentQuick, { watts: '777', hours: '2,5' });
assert.equal(currentQuick.quick.state, 'proposed');
assert.equal(quick.valueOrigin(currentQuick, 'watts'), 'custom');
currentQuick = quick.confirmQuickEquipment(currentQuick);
assert.equal(currentQuick.watts, '777');
assert.equal(currentQuick.hours, '2,5');
assert.equal(quick.valueOrigin(currentQuick, 'watts'), 'custom');
near(quick.estimateConfiguredInventory([currentQuick], ['air-conditioner']).total, 0.777 * 2.5 * 0.65);

// Cold ignores unrelated usage fields; quick UI never requests hours/days for it.
for (const type of ['fridge', 'freezer']) {
  currentQuick = quick.confirmQuickEquipment(quick.createQuickEquipment(`cold-${type}`, type));
  const before = engine.estimateEquipment(currentQuick).daily;
  currentQuick = quick.editEquipment(currentQuick, { days: '0', hours: '0' });
  state = [];
  quickTree = renderQuick();
  assert.ok(!nodes(quickTree).some((node) => node.props.accessibilityLabel?.startsWith('Heures/jour :')));
  assert.ok(!nodes(quickTree).some((node) => node.props.accessibilityLabel?.startsWith('Jours/semaine :')));
  near(engine.estimateEquipment(currentQuick).daily, before);
}
currentQuick = quick.createQuickEquipment('washer', 'washing-machine'); state = [];
assert.ok(nodes(renderQuick()).some((node) => node.props.accessibilityLabel === 'Cycles/semaine : 4 cycles/sem.'));
nodes(renderQuick()).find((node) => node.props.accessibilityLabel === 'Cycles/semaine : 7 cycles/sem.').props.onPress();
currentQuick = quick.confirmQuickEquipment(currentQuick);
near(engine.estimateEquipment(currentQuick).daily, 0.65);

// Actual provider: two independent rapid sheets, profile confirmation, dashboard and back.
state = [];
provider = render(() => SetupDraftProvider({})).props.value;
provider.addEquipment('fan'); provider.addEquipment('fan');
provider = render(() => SetupDraftProvider({})).props.value;
assert.notEqual(provider.equipment[0].id, provider.equipment[1].id);
assert.notEqual(provider.equipment[0].name, provider.equipment[1].name);
assert.ok(provider.equipment.every((item) => item.quick.state === 'proposed'));
reset(); state = [];
draft.equipment = provider.equipment;
draft.selected = ['fan']; params.appliances = 'fan';
estimateButton(render(Configuration)).props.onPress();
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');
assert.ok(draft.equipment.every((item) => item.quick.state === 'confirmed'));
draft.equipment = draft.equipment.map(quick.confirmQuickEquipment);
draft.equipment[0] = quick.editEquipment(draft.equipment[0], { hours: '1.25' });
const retainedQuick = JSON.stringify(draft.equipment);
estimateButton(render(Configuration)).props.onPress();
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');
params = calls.at(-1).params;
assert.ok(text(render(Dashboard)).includes('Profils provisoires utilisés.'));
assert.ok(text(render(Dashboard)).includes('Renseignez votre solde'));
button(render(Dashboard), 'Modifier mes appareils').props.onPress();
assert.equal(calls.at(-1).pathname, '/configuration-appareils');
assert.equal(JSON.stringify(draft.equipment), retainedQuick);
toggle('Ventilateur');
assert.equal(draft.selected.length, 0);
toggle('Ventilateur');
assert.equal(JSON.stringify(draft.equipment), retainedQuick);
params = { ...params, ...utils.balanceParams({ kWh: 0, validatedAt: '2026-11-14T10:00:00.000Z' }) };
assert.ok(text(render(Dashboard)).includes('Crédit épuisé au moment du relevé'));
params = { ...params, ...utils.balanceParams({ kWh: 90, validatedAt: '2026-11-14T10:00:00.000Z' }) };
assert.ok(nodes(render(Dashboard)).some(n => n.props.date === params.validatedAt));
assert.equal(JSON.stringify(draft.equipment), retainedQuick);
console.log('Quick profiles: explicit confirmation, provenance, preview/cancel/replace, custom preservation, tactile usage, cold/cycles, independent sheets, dashboard and balance cases passed.');

const validation = load('src/utils/configuration-validation.ts');
const GLOBAL_ACTION = 'Voir mon estimation';
function mountConfiguration() {
  effects = []; captureEffects = true;
  render(Configuration);
  captureEffects = false;
  const mountEffects = effects; effects = [];
  mountEffects.forEach((effect) => effect());
  return render(Configuration);
}

// Multiple selections -> automatic sheets -> one confirmation -> dashboard.
reset();
toggle('Climatiseur'); toggle('Réfrigérateur'); toggle('Machine à laver');
button(render(Appareils), 'Configurer mes appareils').props.onPress();
params = calls.at(-1).params;
assert.equal(draft.equipment.length, 3);
assert.ok(draft.equipment.every((item) => item.quick.state === 'proposed'));
let automaticTree = mountConfiguration();
assert.equal(draft.equipment.length, 3); // Step 4 plus step 5 initialization is idempotent.
assert.ok(text(automaticTree).includes('valide les usages et profils estimatifs présentés'));
assert.ok(!text(automaticTree).includes('Provenance :'));
assert.ok(text(automaticTree).includes('Consulter les hypothèses'));
const automaticIds = draft.equipment.map((item) => item.id);
mountConfiguration(); mountConfiguration();
assert.deepEqual(draft.equipment.map((item) => item.id), automaticIds);
button(render(Configuration), GLOBAL_ACTION).props.onPress();
assert.ok(draft.equipment.every((item) => item.quick.state === 'confirmed'));
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');
params = calls.at(-1).params;
assert.ok(text(render(Dashboard)).includes('Estimation indicative'));
assert.ok(text(render(Dashboard)).includes('Renseignez votre solde'));
button(render(Dashboard), 'Modifier mes appareils').props.onPress();
mountConfiguration();
assert.deepEqual(draft.equipment.map((item) => item.id), automaticIds);
assert.ok(draft.equipment.every((item) => item.quick.state === 'confirmed'));
params = { ...params, ...utils.balanceParams({ kWh: 0, validatedAt: '2026-11-14T10:00:00.000Z' }) };
estimateButton(render(Configuration)).props.onPress();
params = calls.at(-1).params;
assert.ok(text(render(Dashboard)).includes('Crédit épuisé au moment du relevé'));

// Direct step-5 entry also prepares sheets, retaining partial/confirmed/custom sheets.
reset(); params.appliances = 'fan,tv';
draft.equipment = [quick.editEquipment(quick.createQuickEquipment('custom-sheet', 'fan'), { watts: '52', hours: '2,75' })];
const customized = draft.equipment[0];
mountConfiguration();
assert.equal(draft.equipment.length, 2);
assert.equal(draft.equipment[0], customized);
const originals = draft.equipment.map((item) => ({ id: item.id, watts: item.watts, hours: item.hours }));
button(render(Configuration), GLOBAL_ACTION).props.onPress();
assert.deepEqual(draft.equipment.map((item) => ({ id: item.id, watts: item.watts, hours: item.hours })), originals);
assert.equal(quick.valueOrigin(draft.equipment[0], 'watts'), 'custom');
assert.equal(quick.valueOrigin(draft.equipment[0], 'hours'), 'custom');
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');

// The captured presentation cannot confirm inactive, new, changed or alternative profiles.
const shown = quick.createQuickEquipment('shown', 'fan');
const hidden = quick.createQuickEquipment('hidden', 'tv');
const late = quick.createQuickEquipment('late', 'fan');
const priorConfirmed = quick.confirmQuickEquipment(quick.createQuickEquipment('prior', 'fan'));
const presentations = quick.presentedProfiles([shown, hidden, priorConfirmed], ['fan']);
assert.equal(presentations.length, 1);
let confirmation = quick.confirmPresentedProfiles([shown, hidden, late, priorConfirmed], presentations);
assert.equal(confirmation[0].quick.state, 'confirmed');
assert.equal(confirmation[1], hidden);
assert.equal(confirmation[2], late);
assert.equal(confirmation[3], priorConfirmed);
const changedAfterPresentation = quick.editEquipment(shown, { watts: '88' });
assert.equal(quick.confirmPresentedProfiles([changedAfterPresentation], presentations)[0], changedAfterPresentation);
const differentProfile = quick.previewProfileChange(shown, catalogue.profilesFor('fan')[1]).candidate;
assert.equal(quick.confirmPresentedProfiles([differentProfile], presentations)[0], differentProfile);

// No profile: only the missing daily energy is required; an empty field stays unknown.
reset(); params.appliances = 'other';
automaticTree = mountConfiguration();
assert.equal(draft.equipment.length, 1);
assert.equal(draft.equipment[0].quick, undefined);
assert.equal(draft.equipment[0].daily, '');
assert.equal(draft.equipment[0].mode, 'daily');
let noProfileEditorProps = nodes(automaticTree).find((node) => node.type === EquipmentEditor).props;
state = [];
let noProfileEditor = render(() => EquipmentEditor(noProfileEditorProps));
assert.ok(!nodes(noProfileEditor).some(node => node.type === 'TextInput'));
nodes(noProfileEditor).find(node => node.props.accessibilityLabel === 'Réglages avancés').props.onPress();
noProfileEditor = render(() => EquipmentEditor(noProfileEditorProps));
assert.ok(nodes(noProfileEditor).some((node) => node.props.accessibilityLabel?.startsWith('Consommation par appareil (kWh/jour) —')));
assert.ok(!nodes(noProfileEditor).some((node) => node.props.accessibilityLabel?.includes('Puissance électrique')));
estimateButton(automaticTree).props.onPress();
assert.equal(calls.length, 0);
let problems = validation.configurationIssues(draft.equipment, ['other']);
assert.equal(problems.length, 1);
assert.equal(problems[0].field, 'daily');
assert.equal(problems[0].kind, 'invalid');
assert.ok(text(render(Configuration)).includes('Champ obligatoire manquant'));
assert.ok(!text(render(Configuration)).includes('Dépassement numérique'));
noProfileEditorProps = nodes(render(Configuration)).find((node) => node.type === EquipmentEditor).props;
state = [];
noProfileEditor = render(() => EquipmentEditor(noProfileEditorProps));
nodes(noProfileEditor).find((node) => node.props.accessibilityLabel?.startsWith('kWh/jour —')).props.onChangeText('0,4');
estimateButton(render(Configuration)).props.onPress();
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');

// Missing sheet, invalid data, pending profile and actual overflow have distinct diagnoses.
assert.equal(validation.configurationIssues([], ['fan'])[0].kind, 'missing');
assert.equal(validation.configurationIssues([shown], ['fan'])[0].kind, 'profile');
const broken = quick.editEquipment(quick.confirmQuickEquipment(shown), { name: 'Ventilateur salon', hours: '' });
problems = validation.configurationIssues([broken], ['fan']);
assert.equal(problems.length, 1);
assert.equal(problems[0].field, 'hours');
assert.equal(problems[0].name, 'Ventilateur salon');
assert.equal(problems[0].kind, 'invalid');
assert.equal(quick.estimateConfiguredInventory([broken], ['fan']).total, null);
const numericalOverflow = record('other', { name: 'Test dépassement', mode: 'daily', quantity: '2', daily: '9'.repeat(308) });
assert.equal(validation.configurationIssues([numericalOverflow], ['other'])[0].kind, 'overflow');
const overflowingSum = Array.from({ length: 20 }, (_, index) => ({ ...huge, id: `sum-${index}` }));
assert.equal(validation.configurationIssues(overflowingSum, ['other']).filter((problem) => problem.kind === 'overflow').length, 1);

// Submit reveals the hidden offending input at the top and scrolls to its actual sheet.
reset(); params.appliances = 'fan'; draft.equipment = [broken];
let scrollTree = render(Configuration);
const scrollCalls = [];
scrollTree.props.scrollRef.current = { scrollTo: (options) => scrollCalls.push(options) };
const typeContainer = nodes(scrollTree).find((node) => node.props.onLayout && text(node).startsWith('Ventilateur'));
const sheetContainer = nodes(typeContainer).find((node) => node !== typeContainer && node.props.onLayout);
typeContainer.props.onLayout({ nativeEvent: { layout: { y: 500 } } });
sheetContainer.props.onLayout({ nativeEvent: { layout: { y: 50 } } });
estimateButton(scrollTree).props.onPress();
assert.equal(calls.length, 0);
assert.deepEqual(scrollCalls.at(-1), { y: 538, animated: true });
scrollTree = render(Configuration);
const faultyEditorProps = nodes(scrollTree).find((node) => node.type === EquipmentEditor).props;
assert.equal(faultyEditorProps.revealErrors, true);
assert.equal(faultyEditorProps.problem.field, 'hours');
state = [];
const faultyEditor = render(() => EquipmentEditor(faultyEditorProps));
const inputs = nodes(faultyEditor).filter((node) => node.type === 'TextInput');
assert.ok(inputs[0].props.accessibilityLabel.startsWith('Heures/jour — Ventilateur salon'));
assert.ok(text(faultyEditor).includes('Ventilateur salon · Heures/jour'));
assert.equal(nodes(faultyEditor).find((node) => node.props.accessibilityLabel === 'Réglages avancés').props.accessibilityState.expanded, true);
assert.ok(!text(scrollTree).includes('Dépassement numérique'));

// Deleting the last sheet is diagnosed explicitly; render alone does not recreate it.
draft.equipment = [];
estimateButton(render(Configuration)).props.onPress();
assert.ok(text(render(Configuration)).includes('Fiche absente'));
assert.equal(calls.length, 0);
assert.equal(draft.equipment.length, 0);

// Actual provider reconciliation preserves identity and custom data on repeated visits.
state = [];
provider = render(() => SetupDraftProvider({})).props.value;
provider.ensureEquipment(['fan', 'fridge', 'other']);
provider = render(() => SetupDraftProvider({})).props.value;
const providerIds = provider.equipment.map((item) => item.id);
provider.setEquipment((items) => items.map((item) => item.type === 'fan' ? quick.editEquipment(item, { hours: '4,25' }) : item));
provider.ensureEquipment(['fan', 'fridge', 'other']); provider.ensureEquipment(['fan', 'fridge']);
provider = render(() => SetupDraftProvider({})).props.value;
assert.deepEqual(provider.equipment.map((item) => item.id), providerIds);
assert.equal(provider.equipment.find((item) => item.type === 'fan').hours, '4,25');
assert.equal(provider.equipment.find((item) => item.type === 'other').daily, '');
console.log('Step 5 regression: automatic sheets, idempotent back navigation, presented-only global confirmation, custom preservation, no profile, precise errors, reveal/scroll, overflow and unknown/zero balances passed.');

// Presentation and scenarios use the unchanged engine, including all household members.
const presentation = load('src/utils/dashboard.ts');
for (const [days, expected] of [[1.27, '1 jour et 6 heures'], [1.999, '2 jours'], [1 / 48, 'Moins d’une heure'], [1 / 24, '1 heure'], [null, 'Durée indéterminée'], [Infinity, 'Durée indéterminée'], [Number.MAX_VALUE, 'Durée indéterminée']]) {
  assert.equal(presentation.formatDuration(days), expected);
}
assert.equal(presentation.autonomyLabel(null, 10), 'Renseignez votre solde');
assert.equal(presentation.autonomyLabel(0, 0), 'Crédit épuisé au moment du relevé');
assert.equal(presentation.autonomyLabel(10, 0), 'Durée indéterminée');
assert.equal(presentation.autonomyLabel(10, null), 'Durée indéterminée');
for (const [value, total, expected] of [[5, 10, 50], [0, 0, 0], [null, 5, 0], [5, null, 0], [20, 10, 100], [-1, 10, 0], [Infinity, 10, 0]]) {
  assert.equal(presentation.barPercent(value, total), expected);
}
const baseline = references.map((item) => ({ ...item }));
const baselineJSON = JSON.stringify(baseline);
let scenario = presentation.cloneScenario(baseline);
assert.notEqual(scenario[0], baseline[0]);
near(quick.estimateConfiguredInventory(scenario, selectedTypes).total, 10);
assert.deepEqual(presentation.compareConsumption(10, 10), { difference: 0, month: 0, percent: 0 });
scenario[0] = presentation.changeScenario(scenario[0], '6');
near(quick.estimateConfiguredInventory(scenario, selectedTypes).total, 6.4);
near(presentation.compareConsumption(10, 6.4).month, 108);
near(presentation.compareConsumption(10, 6.4).percent, 36);
scenario[0] = presentation.changeScenario(scenario[0], '24');
near(quick.estimateConfiguredInventory(scenario, selectedTypes).total, 17.2);
assert.ok(presentation.compareConsumption(10, 17.2).month < 0);
assert.equal(JSON.stringify(baseline), baselineJSON);
const cycleRecord = record('washing-machine', { perCycle: '1', cycles: '7' });
near(engine.estimateEquipment(presentation.changeScenario(cycleRecord, '3')).daily, 3 / 7);
for (const item of [record('fridge', { mode: 'power' }), record('freezer', { mode: 'cycle' }), record('other', { mode: 'daily' }), record('other', { mode: 'annual' })]) {
  assert.equal(presentation.scenarioField(item), null);
  assert.equal(presentation.changeScenario(item, '0'), item);
}
const metadata = quick.confirmQuickEquipment(quick.createQuickEquipment('independent', 'fan'));
const independent = presentation.cloneScenario([metadata]);
assert.notEqual(independent[0].quick.origins, metadata.quick.origins);
independent[0] = presentation.changeScenario(independent[0], '');
assert.equal(quick.estimateConfiguredInventory(independent, ['fan']).total, null);
assert.equal(presentation.compareConsumption(10, null), null);
assert.equal(presentation.compareConsumption(0, 1).percent, null);
console.log('Dashboard/scenarios: duration rounding, unknown/zero/incomplete, proportional bars, unchanged/reduction/increase, cycles, protected cold profiles and independent reference passed.');

reset();
draft.equipment = baseline;
params.appliances = selectedTypes.join(',');
const Economies = load('src/app/economies.tsx').default;
let simulationTree = render(Economies);
assert.ok(text(simulationTree).includes('de différence sur 30 jours'));
const quickChoice = nodes(simulationTree).find((node) => node.props.accessibilityLabel === 'Clim chambre : 2 Heures/jour');
assert.ok(quickChoice);
quickChoice.props.onPress();
simulationTree = render(Economies);
assert.ok(text(simulationTree).includes('économisés sur 30 jours'));
assert.equal(JSON.stringify(draft.equipment), baselineJSON);
button(simulationTree, 'Réinitialiser la simulation').props.onPress();
assert.ok(text(render(Economies)).includes('de différence sur 30 jours'));

reset();
const Informations = load('src/app/informations-foyer.tsx').default;
let informationTree = render(Informations);
assert.ok(!nodes(informationTree).some((node) => node.props.accessibilityLabel === 'Solde au relevé en kWh'));
button(informationTree, 'Mettre à jour mon solde').props.onPress();
assert.equal(calls.at(-1), '/nouveau-solde');
button(render(Informations), 'Enregistrer les informations').props.onPress();
assert.equal(calls.at(-1).pathname, '/tableau-de-bord');
assert.equal(utils.readBalance(calls.at(-1).params).kWh, null);
reset();
params = { ...params, ...utils.balanceParams({ kWh: 12, validatedAt: '2026-11-14T10:00:00.000Z' }) };
button(render(Informations), 'Enregistrer les informations').props.onPress();
assert.equal(calls.at(-1).params.validatedAt, params.validatedAt);
console.log('Screen interactions: independent simulation/reset, dedicated balance route and household edits preserving the reading passed.');

assert.equal(presentation.formatShare(7.8, 10), '78 % du total');
assert.equal(presentation.formatShare(7.849, 10), '78 % du total');
near(presentation.barPercent(7.849, 10), 78.49);
assert.equal(presentation.formatShare(null, 10), 'Part indéterminée');
assert.equal(presentation.formatShare(0, 0), '0 % du total');
const reading = '2026-11-14T10:23:00.000Z';
assert.equal(presentation.formatReadingDate(reading), `14/11/2026 à ${new Date(reading).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
assert.equal(presentation.formatReadingDate('2026-11-14'), '14/11/2026');
assert.equal(presentation.formatReadingDate(null), '');
assert.equal(presentation.formatReadingDate('bad'), '');
assert.equal(utils.readBalance({ balanceStatus: 'known', balanceKWh: '12', validatedAt: '2026-11-14' }).validatedAt, '2026-11-14');
assert.equal(utils.readBalance({ balanceStatus: 'known', balanceKWh: '12', validatedAt: '2026-02-30' }).kWh, null);

reset();
params = { ...params, appliances: 'water-heater', ...utils.balanceParams({ kWh: 12, validatedAt: reading }) };
draft.equipment = [quick.confirmQuickEquipment(quick.createQuickEquipment('heater-audit', 'water-heater'))];
const originalHeater = JSON.stringify(draft.equipment);
near(quick.estimateConfiguredInventory(draft.equipment, ['water-heater']).total, 1);
mountConfiguration();
estimateButton(render(Configuration)).props.onPress();
params = calls.at(-1).params;
let heaterDashboard = render(Dashboard);
assert.ok(text(heaterDashboard).includes(presentation.formatReadingDate(reading)));
let disclosure = nodes(heaterDashboard).find((node) => node.props.accessibilityLabel === 'Chauffe-eau heater-audit, détails');
assert.ok(disclosure);
assert.equal(disclosure.props.accessibilityState.expanded, false);
assert.ok(text(disclosure).includes('Détails'));
assert.ok(disclosure.props.style.minHeight >= 44 && disclosure.props.style.minWidth >= 44);
disclosure.props.onPress();
heaterDashboard = render(Dashboard);
disclosure = nodes(heaterDashboard).find((node) => node.props.accessibilityLabel === 'Chauffe-eau heater-audit, réduire');
assert.equal(disclosure.props.accessibilityState.expanded, true);
assert.ok(text(disclosure).includes('Réduire'));
assert.ok(text(heaterDashboard).includes('Cycles/semaine : 5'));
disclosure.props.onPress();
assert.ok(text(render(Dashboard)).includes('Détails'));
mountConfiguration(); mountConfiguration();
assert.equal(JSON.stringify(draft.equipment), originalHeater);
near(quick.estimateConfiguredInventory(draft.equipment, ['water-heater']).total, 1);
draft.equipment = draft.equipment.map((item) => quick.editEquipment(item, { cycles: '14' }));
const customHeater = JSON.stringify(draft.equipment);
mountConfiguration(); mountConfiguration();
render(Dashboard);
assert.equal(JSON.stringify(draft.equipment), customHeater);
near(quick.estimateConfiguredInventory(draft.equipment, ['water-heater']).total, 2.8);
assert.equal(params.validatedAt, reading);
console.log('Dashboard refinements: whole shares/exact bars, recorded date/time/date-only, accessible disclosure and heater 5/14-cycle conservation across navigation passed.');

// Compact cards preserve data; editing a confirmed profile invalidates consent.
{
  let record = quick.confirmQuickEquipment(quick.createQuickEquipment('compact-fan', 'fan'));
  const before = JSON.stringify(record);
  const props = () => ({ record, onChange: value => { record = value; }, onDelete: () => {} });
  state = [];
  let tree = render(() => EquipmentEditor(props()));
  assert.ok(!nodes(tree).some(node => node.type === 'TextInput'));
  assert.ok(!text(tree).includes('Confirmer le profil et mes choix'));
  assert.equal(JSON.stringify(record), before);
  nodes(tree).find(node => node.props.accessibilityLabel === 'Réglages avancés').props.onPress();
  tree = render(() => EquipmentEditor(props()));
  nodes(tree).find(node => node.props.accessibilityLabel?.startsWith('Heures par jour')).props.onChangeText('3,25');
  assert.equal(record.quick.state, 'proposed');
  assert.equal(record.hours, '3,25');
  tree = render(() => EquipmentEditor(props()));
  nodes(tree).find(node => node.props.accessibilityLabel === 'Réglages avancés').props.onPress();
  tree = render(() => EquipmentEditor(props()));
  assert.ok(!nodes(tree).some(node => node.type === 'TextInput'));
  assert.ok(text(tree).includes('Réglages personnalisés actifs'));
  const rawTotal = engine.estimateEquipment(record).daily;
  const presented = quick.presentedProfiles([record], ['fan']);
  const confirmed = quick.confirmPresentedProfiles([record], presented)[0];
  assert.equal(confirmed.hours, '3,25');
  assert.equal(quick.estimateConfiguredInventory([confirmed], ['fan']).total, rawTotal);
  const changedLater = quick.editEquipment(record, { hours: '4' });
  assert.equal(quick.confirmPresentedProfiles([changedLater], presented)[0].quick.state, 'proposed');
  state = []; // Remount, like navigating back to the screen.
  record = confirmed;
  tree = render(() => EquipmentEditor(props()));
  assert.ok(!nodes(tree).some(node => node.type === 'TextInput'));
  assert.equal(record.hours, '3,25');
  assert.equal(record.quantity, '1');
}
console.log('Compact step 5: collapsed/remounted custom values, advanced disclosure, changed-confirmation invalidation and identical engine results passed.');

state = [false, true];
let decorated = { ...quick.createQuickEquipment('icon-only', 'other'), daily: '0.4' };
const undecorated = JSON.parse(JSON.stringify(decorated));
const iconTree = render(() => EquipmentEditor({ record: decorated, onChange: updated => { decorated = updated; }, onDelete() {} }));
nodes(iconTree).find(n => n.props.accessibilityLabel === 'Icône Bouilloire').props.onPress();
assert.equal(decorated.iconKey, 'kettle');
assert.deepEqual({ ...decorated, iconKey: undefined }, { ...undecorated, iconKey: undefined });
near(engine.estimateEquipment(decorated).daily, engine.estimateEquipment(undecorated).daily);
assert.ok(load('src/utils/local-draft.ts').validEquipment(decorated));
console.log('Optional SVG choice: type, settings, profile state and consumption unchanged; metadata accepted by existing restoration format.');
