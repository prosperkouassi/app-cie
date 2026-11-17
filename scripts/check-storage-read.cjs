/* global __dirname, setTimeout */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/storage-read.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const implementation = { exports: {} };
new Function('module', 'exports', code)(implementation, implementation.exports);
const { readWithDeadline, StorageReadTimeout } = implementation.exports;
(async () => {
  assert.equal(await readWithDeadline(async () => 'saved', 100), 'saved');
  assert.equal(await readWithDeadline(async () => null, 100), null);
  const original = Error('denied');
  await assert.rejects(readWithDeadline(() => Promise.reject(original), 100), (error) => error === original);
  await assert.rejects(readWithDeadline(() => { throw original; }, 100), (error) => error === original);
  let finishLate;
  let accepted = false;
  const pending = readWithDeadline(() => new Promise((resolve) => { finishLate = resolve; }), 5).then(() => { accepted = true; });
  await assert.rejects(pending, StorageReadTimeout);
  finishLate('stale');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(accepted, false, 'Late read cannot restore stale data after failure');
  console.log('Storage read: success/absent, sync/async errors, stalled read timeout and late result rejection passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
