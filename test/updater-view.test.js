// NEED: состояние окна считает шелл, рисует их движок без изменений.
// viewOf({game, installed, check, busy, prefs, gameDir}) -> view их формы:
// {busy, panel:'news', version, status, detail, progress, statusActions,
//  play, news:{items,note}, options:{files, checkOnLaunch}}.
// - игра неизвестна: версия пуста, note с русской причиной.
// - available: экшен Установить (primary) + баннер-новость из notes.
// - откат в экшенах только при >=2 паков; Играть всегда disabled (не наш scope).
import test from 'node:test';
import assert from 'node:assert/strict';
import { viewOf } from '../updater/lib/view.js';

const GAME = { version: '0.1.7815', source: 'app.asar' };
const INSTALLED = [{ file: 'ru-pack-1.2.0.zip', version: '1.2.0', game: '7815' }];
const ENTRY = { version: '1.3.0', gameMin: '7506', gameMax: '7815', files: [], url: 'https://example.invalid/b.zip', sha: 's', notes: ['Фикс шрифтов.'] };

test('unknown game: empty version, Russian note, check action only', () => {
  const v = viewOf({ game: { version: null, reason: 'app.asar unreadable' }, installed: [], check: null, busy: false, prefs: { autoCheck: false }, gameDir: '' });
  assert.equal(v.version, '');
  assert.ok(v.news.note.includes('app.asar'), v.news.note);
  assert.deepEqual(v.statusActions.map((a) => a.id), ['check']);
  assert.equal(v.play.enabled, false);
  assert.equal(v.options.checkOnLaunch, false);
});

test('available pack: primary install action, notes in news, game dir shown', () => {
  const v = viewOf({ game: GAME, installed: INSTALLED, check: { status: 'available', entry: ENTRY }, busy: false, prefs: { autoCheck: true }, gameDir: 'C:\\Game' });
  assert.equal(v.version, 'v0.1.7815');
  const install = v.statusActions.find((a) => a.id === 'install');
  assert.equal(install.primary, true);
  assert.ok(install.label.includes('1.3.0'), install.label);
  assert.equal(v.news.items.length, 1);
  assert.equal(v.news.items[0].version, '1.3.0');
  assert.ok(v.options.files.path.includes('Game'), v.options.files.path);
  assert.equal(v.options.checkOnLaunch, true);
});

test('rollback action only with two packs; up-to-date has no install', () => {
  const two = [...INSTALLED, { file: 'ru-pack-1.1.0.zip', version: '1.1.0', game: '7815' }];
  const v = viewOf({ game: GAME, installed: two, check: { status: 'up-to-date', entry: ENTRY }, busy: false, prefs: {}, gameDir: '' });
  assert.ok(v.statusActions.some((a) => a.id === 'rollback'), 'rollback present');
  assert.ok(!v.statusActions.some((a) => a.id === 'install'), 'no install when current');
  const one = viewOf({ game: GAME, installed: INSTALLED, check: null, busy: false, prefs: {}, gameDir: '' });
  assert.ok(!one.statusActions.some((a) => a.id === 'rollback'), 'no rollback with one pack');
});

test('install failure speaks Russian in status', () => {
  const v = viewOf({ game: GAME, installed: INSTALLED, check: { status: 'install-failed', reason: 'net-error' }, busy: false, prefs: {}, gameDir: '' });
  assert.ok(v.status.includes('соединения'), v.status);
});

test('game update is a separate banner with download action, pack untouched', () => {
  const v = viewOf({
    game: GAME,
    installed: INSTALLED,
    check: { status: 'up-to-date', entry: ENTRY },
    gameUpdate: { status: 'available', tag: 'app-v0.1.8127' },
    busy: false, prefs: {}, gameDir: '',
  });
  assert.ok(v.status.includes('0.1.8127'), v.status);
  const dl = v.statusActions.find((a) => a.id === 'download-game');
  assert.ok(dl, 'download action present');
  assert.ok(!v.statusActions.some((a) => a.id === 'install'), 'pack install stays separate');
});

test('current game shows no banner', () => {
  const v = viewOf({ game: GAME, installed: INSTALLED, check: null, gameUpdate: { status: 'current' }, busy: false, prefs: {}, gameDir: '' });
  assert.ok(!v.statusActions.some((a) => a.id === 'download-game'), 'no banner when current');
});

test('failed game check lands in detail, pack status stays', () => {
  const v = viewOf({ game: GAME, installed: INSTALLED, check: { status: 'up-to-date', entry: ENTRY }, gameUpdate: { status: 'failed' }, busy: false, prefs: {}, gameDir: '' });
  assert.ok(v.status.includes('последний перевод'), v.status);
  assert.ok(v.detail.includes('игры'), v.detail);
});
