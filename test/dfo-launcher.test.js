import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const en = JSON.parse(fs.readFileSync(new URL('../src/locale/en.json', import.meta.url), 'utf8'));
const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

const L = (k) => `launcher.${k}`;
const NEED = [
  'news.title', 'news.loading', 'news.offline', 'news.no_check', 'news.none',
  'badge.new', 'badge.update',
  'setup.looking', 'setup.where', 'setup.use_files', 'setup.blurb', 'setup.retry',
  'setup.get_steam', 'setup.get_gog', 'setup.from_dfu', 'setup.on_pc',
  'setup.jan', 'setup.dec',
  'files.title', 'files.change', 'files.choose', 'files.unset',
  'saves.title', 'saves.open',
  'updates.title', 'updates.auto', 'updates.reinstall',
  'play.play',
  'status.notice', 'status.background', 'status.failed', 'status.stuck',
  'status.offline', 'status.skipped', 'status.uptodate', 'status.downloading',
  'detail.notice', 'detail.stuck',
  'progress.mb', 'progress.starting',
  'action.download', 'action.play_no_update', 'action.get_installer',
  'dlg.leave_title', 'dlg.leave_body', 'dlg.restart_title', 'dlg.restart_body',
  'dlg.reinstall_title', 'dlg.cancel',
];

const braces = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('launcher table complete: EN+RU same keys, RU non-empty', () => {
  for (const k of NEED) {
    assert.ok(en.dfo?.[L(k)], 'en has ' + L(k));
    assert.ok(ru.dfo?.[L(k)]?.length > 0, 'ru has ' + L(k));
  }
});

test('launcher placeholders parity EN/RU', () => {
  for (const k of Object.keys(en.dfo ?? {}).filter((k) => k.startsWith('launcher.'))) {
    assert.equal(braces(ru.dfo[k]), braces(en.dfo[k]), 'braces ' + k);
  }
});

test('launcher strings render in RU', () => {
  setLocale('ru');
  assert.equal(t('dfo:launcher.play.play'), 'Играть');
  assert.equal(t('dfo:launcher.status.notice', { version: '0.1.7319' }), 'Вышла версия 0.1.7319');
  assert.equal(t('dfo:launcher.progress.mb', { done: 3, total: 9 }), '3 из 9 МБ');
  setLocale('en');
});

test('launcher detail lines read as Russian, not calques', () => {
  setLocale('ru');
  assert.equal(
    t('dfo:launcher.detail.same_version'),
    'Установится перед запуском игры, чтобы у вас была та же версия, что у всех в сети.'
  );
  setLocale('en');
});
