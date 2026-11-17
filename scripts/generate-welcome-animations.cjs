// Original app-CIE vector artwork. Generates embedded Lottie JSON; no external assets.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../assets/animations/welcome');
fs.mkdirSync(output, { recursive: true });
const navy = [20 / 255, 33 / 255, 66 / 255, 1];
const pink = [78 / 255, 132 / 255, 37 / 255, 1];
const pale = [0.94, 0.95, 0.98, 1];
const white = [1, 1, 1, 1];
const prop = (k) => ({ a: 0, k });
const transform = { o: prop(100), r: prop(0), p: prop([0, 0, 0]), a: prop([0, 0, 0]), s: prop([100, 100, 100]) };
function fill(color) { return { ty: 'fl', c: prop(color), o: prop(100), r: 1 }; }
function stroke(color, width = 4) { return { ty: 'st', c: prop(color), o: prop(100), w: prop(width), lc: 2, lj: 2 }; }
function rect(x, y, w, h, color, radius = 8, outline) { return [{ ty: 'rc', p: prop([x, y]), s: prop([w, h]), r: prop(radius), d: 1 }, ...(color ? [fill(color)] : []), ...(outline ? [stroke(outline)] : [])]; }
function ellipse(x, y, w, h, color, outline) { return [{ ty: 'el', p: prop([x, y]), s: prop([w, h]), d: 1 }, ...(color ? [fill(color)] : []), ...(outline ? [stroke(outline)] : [])]; }
function line(points, color, width = 4, closed = false, solid = false) {
  return [{ ty: 'sh', ks: prop({ i: points.map(() => [0, 0]), o: points.map(() => [0, 0]), v: points, c: closed }) }, solid ? fill(color) : stroke(color, width)];
}
function layer(name, shapes, ks = {}) { return { ddd: 0, ind: 0, ty: 4, nm: name, sr: 1, ks: { ...transform, ...ks }, ao: 0, shapes: [{ ty: 'gr', it: [...shapes, { ty: 'tr', p: prop([0, 0]), a: prop([0, 0]), s: prop([100, 100]), r: prop(0), o: prop(100), sk: prop(0), sa: prop(0) }] }], ip: 0, op: 120, st: 0, bm: 0 }; }
function gentle(values) { return { a: 1, k: values.map(([t, value], i) => ({ t, s: value, ...(i < values.length - 1 ? { i: { x: [0.65], y: [1] }, o: { x: [0.35], y: [0] } } : {}) })) }; }
function write(name, layers) {
  const data = { v: '5.7.4', fr: 30, ip: 0, op: 120, w: 320, h: 240, nm: `app-CIE ${name}`, ddd: 0, assets: [], layers: layers.map((l, i) => ({ ...l, ind: i + 1 })), markers: [], meta: { author: 'Original artwork for app-CIE by the development assistant', license: 'MIT', generator: 'scripts/generate-welcome-animations.cjs' } };
  fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(data) + '\n');
}
// Layers are ordered front to back. Every first frame is a complete, meaningful picture.
write('home', [
  layer('spark', line([[248, 42], [237, 62], [251, 62], [240, 83]], pink, 5), { o: gentle([[0, [70]], [50, [100]], [110, [80]]]) }),
  layer('fridge-handle', line([[205, 129], [205, 142]], white, 3)),
  layer('fridge-divider', line([[185, 118], [220, 118]], white, 2)),
  layer('fridge', rect(202, 137, 40, 78, navy, 7)),
  layer('tv-screen', rect(122, 142, 49, 32, pale, 4)),
  layer('tv', rect(122, 142, 60, 44, navy, 7)),
  layer('tv-foot', line([[122, 164], [122, 176], [108, 176], [136, 176]], navy, 4)),
  layer('windows', [...rect(113, 97, 20, 20, pink, 5), ...rect(145, 97, 20, 20, pink, 5)], { o: gentle([[0, [65]], [65, [100]], [119, [100]]]) }),
  layer('roof', line([[64, 91], [160, 31], [249, 91]], navy, 8)),
  layer('wall', rect(160, 138, 164, 125, white, 16, navy)),
  layer('ground', rect(160, 210, 245, 12, pale, 6)),
]);
write('energy', [
  layer('bolt', line([[166, 77], [144, 119], [163, 119], [152, 152], [181, 108], [162, 108]], white, 1, true, true)),
  layer('energy-fill', rect(160, 123, 125, 68, pink, 12), { o: gentle([[0, [60]], [70, [100]], [119, [100]]]) }),
  layer('battery-case', rect(160, 123, 157, 95, navy, 18)),
  layer('terminal', rect(247, 123, 14, 35, navy, 5)),
  layer('meter-lamp', ellipse(160, 56, 13, 13, pink), { o: gentle([[0, [70]], [65, [100]], [119, [100]]]) }),
  layer('meter', rect(160, 124, 214, 177, white, 26, navy)),
  layer('cable', line([[160, 214], [160, 229], [240, 229]], navy, 4)),
  layer('ground', rect(160, 226, 245, 10, pale, 5)),
]);
write('comparison', [
  layer('leaf-vein', line([[235, 55], [252, 38]], navy, 3)),
  layer('leaf', ellipse(245, 45, 32, 22, pink), { r: prop(-30), a: prop([245, 45, 0]), p: prop([245, 45, 0]) }),
  layer('arrow', line([[120, 72], [181, 72], [171, 62], [181, 72], [171, 82]], navy, 4)),
  layer('scenario-bar', rect(199, 158, 47, 76, pink, 10), { o: gentle([[0, [65]], [75, [100]], [119, [100]]]) }),
  layer('current-bar', rect(112, 134, 47, 124, navy, 10)),
  layer('baseline', line([[65, 202], [254, 202]], navy, 4)),
  layer('sheet', rect(160, 134, 244, 188, white, 24)),
  layer('ground', rect(160, 218, 245, 10, pale, 5)),
]);
console.log('Generated three original 4-second Lottie animations.');
