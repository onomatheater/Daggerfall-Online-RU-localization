// NEED: внешний пак из Prefs/Locale (ядро иммунитета).
// - loadExternalPack(packDir, gameVersion, bundled): читает распакованный
//   пак (locale-version.json + ru.json), гейтит по версии игры, регистрирует
//   таблицы в overlay. Отказ — {ok:false, reason}, никогда throw: клиент живёт дальше.
// - Нет dir/манифеста -> {ok:false}; чужая версия -> {ok:false};
//   битый ru.json / BOM -> {ok:false}; валидный пак -> {ok:true} + RU-резолв.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadExternalPack } from '../tools/load-pack.mjs';

const EN = { strings: { hello: 'Hello %s.', bye: 'Bye.' } };

function makePack({ manifest, ruJson, ruRaw } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ruext-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'locale-version.json'), JSON.stringify(manifest ?? {
    locale: 'ru', version: '1.0.0', game: '7553', files: ['ru.json'],
  }));
  writeFileSync(join(dir, 'ru.json'), ruRaw ?? JSON.stringify(ruJson ?? {
    strings: { hello: 'Привет %s.' },
  }));
  return dir;
}

test('missing dir returns {ok:false}, never throws', () => {
  const hit = loadExternalPack(join(tmpdir(), 'ruext-no-such-dir'), '7553', { en: EN });
  assert.equal(hit.ok, false);
  assert.ok(typeof hit.reason === 'string' && hit.reason.length > 0, 'reason explains');
});

test('incompatible game version returns {ok:false}', () => {
  const dir = makePack();
  try {
    const hit = loadExternalPack(dir, '7506', { en: EN });
    assert.equal(hit.ok, false);
    assert.match(String(hit.reason), /incompatible|game/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('broken ru.json and BOM return {ok:false}', () => {
  const broken = makePack({ ruRaw: '{oops' });
  const bom = makePack({ ruRaw: String.fromCharCode(0xFEFF) + '{"strings":{}}' });
  try {
    assert.equal(loadExternalPack(broken, '7553', { en: EN }).ok, false);
    assert.equal(loadExternalPack(bom, '7553', { en: EN }).ok, false);
  } finally {
    rmSync(broken, { recursive: true, force: true });
    rmSync(bom, { recursive: true, force: true });
  }
});

test('valid pack registers overlay: RU hit, EN fallback', () => {
  const dir = makePack();
  try {
    const hit = loadExternalPack(dir, '0.1.7553', { en: EN });
    assert.equal(hit.ok, true);
    assert.equal(hit.overlay.resolve('strings:hello', { s: 'мир' }, 'ru'), 'Привет мир.');
    assert.equal(hit.overlay.resolve('strings:bye', {}, 'ru'), 'Bye.');
    assert.ok(hit.overlay.has('strings:hello', 'ru'), 'presence reported');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
