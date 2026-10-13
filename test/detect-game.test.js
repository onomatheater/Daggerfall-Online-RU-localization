// NEED: апдейтер сам узнаёт версию игры из установки, руками не передаём.
// - package.json с version -> {version, source: 'package.json'}.
// - иначе app-update.yml со строкой version: -> {version, source: 'app-update.yml'}.
// - нет ни того ни другого / битый JSON -> {version: null, reason} (не throw,
//   селектор дальше даст null и клиент останется на старом паке / EN).
// Ноль зависимостей: asar не парсим (это делает установка/лаунчер до нас);
// смотрим только обычные файлы рядом. Сети нет.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectGameVersion } from '../tools/detect-game.mjs';

const mk = () => mkdtempSync(join(tmpdir(), 'rugame-'));

test('detects version from package.json first', () => {
  const dir = mk();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'daggerfall-js-app', version: '0.1.7553' }));
  writeFileSync(join(dir, 'app-update.yml'), 'version: 0.1.0000\n');
  const hit = detectGameVersion(dir);
  assert.equal(hit.version, '0.1.7553');
  assert.equal(hit.source, 'package.json');
});

test('falls back to app-update.yml', () => {
  const dir = mk();
  writeFileSync(join(dir, 'app-update.yml'), 'provider: generic\nversion: 0.1.7553\n');
  const hit = detectGameVersion(dir);
  assert.equal(hit.version, '0.1.7553');
  assert.equal(hit.source, 'app-update.yml');
});

test('missing or broken sources give null with reason, never throw', () => {
  const empty = mk();
  const noHit = detectGameVersion(empty);
  assert.equal(noHit.version, null);
  assert.ok(typeof noHit.reason === 'string' && noHit.reason.length > 0, 'reason present');
  const broken = mk();
  writeFileSync(join(broken, 'package.json'), 'not json{');
  const badHit = detectGameVersion(broken);
  assert.equal(badHit.version, null);
  assert.ok(badHit.reason.length > 0, 'reason present');
});

test('reads version from resources/app.asar via injected reader', () => {
  const dir = mk();
  const hit = detectGameVersion(dir, {
    readAsar: (path) => {
      assert.ok(path.endsWith('app.asar'), `asar path: ${path}`);
      return { version: '0.1.7815' };
    },
  });
  assert.equal(hit.version, '0.1.7815');
  assert.equal(hit.source, 'app.asar');
  const broken = detectGameVersion(mk(), {
    readAsar: () => { throw new Error('boom'); },
  });
  assert.equal(broken.version, null);
  assert.ok(broken.reason.length > 0, 'reason present');
});

test('asar reader roundtrips a real package', async () => {
  const { createPackage } = await import('../updater/node_modules/@electron/asar/lib/asar.js');
  const { readAsarPackageJson } = await import('../updater/lib/asar.js');
  const dir = mk();
  const src = join(dir, 'src');
  mkdirSync(src);
  writeFileSync(join(src, 'package.json'), JSON.stringify({ name: 'game', version: '0.1.7815' }));
  const dest = join(dir, 'app.asar');
  await createPackage(src, dest);
  assert.equal(readAsarPackageJson(dest).version, '0.1.7815');
});

test('describeIssue speaks Russian, never leaks raw English', async () => {
  const { describeIssue } = await import('../updater/lib/flow.js');
  assert.ok(describeIssue('no package.json or app-update.yml').includes('Игра не найдена'), 'game missing');
  assert.ok(describeIssue('app.asar unreadable').includes('прочитать'), 'asar unreadable');
  assert.ok(describeIssue('no package.json, app-update.yml or app.asar').includes('Игра не найдена'), 'legacy reason');
  const unknown = describeIssue('something-else-entirely');
  assert.ok(unknown.startsWith('Не получилось: '), `unknown stays loud: ${unknown}`);
  for (const net of ['fetch failed', 'ENOTFOUND example.invalid', 'UND_ERR_CONNECT_TIMEOUT', 'network timeout']) {
    assert.ok(describeIssue(net).includes('соединения'), `network speaks Russian: ${net}`);
  }
});

test('describeIssue maps updater failure reasons to Russian', async () => {
  const { describeIssue, restoreFailReason } = await import('../updater/lib/flow.js');
  const cases = [
    ['no pack entry selected', 'Пак'],
    ['unpack failed: boom', 'распаковать'],
    ['sha mismatch: expected a, got b', 'sha'],
    ['missing file: C:/x/ru-pack.zip', 'найден'],
    ['migrate: extract failed: boom', 'подготовить'],
    ['base mismatch, missing: dist/a.js', 'версию игры'],
    ['markers lost: foo', 'меток'],
    ['content mismatch: dist/a.js', 'не встал'],
    ['missing after apply: dist/a.js', 'не встал'],
    ['apply failed: boom', 'не встал'],
    ['bad recipe shape', 'испорчен'],
    ['empty backup', 'Откат'],
  ];
  for (const [reason, needle] of cases) {
    const ru = describeIssue(reason);
    assert.ok(ru.includes(needle), `${reason} -> ${ru}`);
  }
  assert.equal(restoreFailReason(new Error('migrate: extract failed: x')), 'migrate: extract failed: x');
  assert.equal(restoreFailReason(undefined), 'net-error');
});

test('nested install one level down is found when root is empty (DFO Online rename)', () => {
  const root = mk();
  const nested = join(root, 'DFO Online');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(nested, 'package.json'), JSON.stringify({ name: 'game', version: '0.1.8404' }));
  const hit = detectGameVersion(root);
  assert.equal(hit.version, '0.1.8404');
});

test('root markers win over nested dir, empty tree stays unknown', () => {
  const root = mk();
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'game', version: '0.1.8127' }));
  const nested = join(root, 'DFO Online');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(nested, 'package.json'), JSON.stringify({ name: 'game', version: '0.1.8404' }));
  assert.equal(detectGameVersion(root).version, '0.1.8127');
  const empty = detectGameVersion(mk());
  assert.equal(empty.version, null);
  assert.ok(empty.reason.length > 0, 'reason present');
});
