import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, t } from '../src/locale/locale.js';

// Хвост shots-панели (нашёл headless-DOM 10.10): шаблоны topCard/emptyCard
// с {count}/{max}/{key}/{state} + note outdoors-двери. Дефолты байт-в-байт
// из shotsPane.js/enhancedMenu.js (включая trailing space kept_count:
// склейка с соседним предложением — scan-guard требует зеркала).
const EN = {
  'shots.kept_count': '{count} of {max} kept in this browser - never uploaded. ',
  'shots.press_key': 'Press {key} in the world to take one.',
  'shots.empty_hint': 'Press {key} anywhere in the world. Up to {max} shots are kept here, and can stand on the loading screens.',
  'shots.download_line': 'Also save each shot as a file: {state}',
  'menu.outdoors_note': 'Pick a season and a weather, and drop into a random town. A test door: it stores nothing, and it names the town in the console.',
};

const RU = {
  'shots.kept_count': '{count} из {max} хранятся в этом браузере и никуда не выгружаются. ',
  'shots.press_key': 'Нажмите {key} в мире, чтобы сделать снимок.',
  'shots.empty_hint': 'Нажмите {key} в любом месте мира. До {max} снимков хранятся здесь и могут показываться на экранах загрузки.',
  'shots.download_line': 'Также сохранять каждый снимок файлом: {state}',
  'menu.outdoors_note': 'Выберите сезон и погоду и окажитесь в случайном городе. Это тестовая дверь: она ничего не сохраняет, а город называет в консоли.',
};

test('shots-tail: exact EN+RU (+trailing space parity)', () => {
  for (const k of Object.keys(EN)) {
    setLocale('en');
    assert.equal(t(`dfo:${k}`), EN[k], `en:${k}`);
    setLocale('ru');
    assert.equal(t(`dfo:${k}`), RU[k], `ru:${k}`);
  }
  setLocale('en');
});

test('shots-tail: placeholders interpolate', () => {
  setLocale('ru');
  assert.equal(
    t('dfo:shots.download_line', { state: t('dfo:val.off') }),
    'Также сохранять каждый снимок файлом: Выкл',
  );
  assert.ok(t('dfo:shots.kept_count', { count: 0, max: 128 }).startsWith('0 из 128 '));
  setLocale('en');
});
