// NEED: вордмарк — снова Jacquard (Press Start 2P откачен решением 12.10),
// читаемый вес — 700 в заголовках/кнопках, 500 в теле (файлы Handjet есть).
// Никаких остатков Press Start в окне.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const css = () => readFileSync(new URL('../updater/launcher/launcher.css', import.meta.url), 'utf8');

test('no press start leftovers in window or fonts', () => {
  assert.doesNotMatch(css(), /font-family: 'Press Start/);
  assert.doesNotMatch(css(), /pressstart-[a-z]+\./);
  assert.doesNotMatch(readFileSync(new URL('../updater/launcher/index.html', import.meta.url), 'utf8'), /Press Start/i);
  for (const f of ['pressstart-cyrillic-400.woff2', 'pressstart-latin-400.woff2', 'OFL-PressStart2P.txt']) {
    assert.equal(existsSync(new URL(`../updater/launcher/fonts/${f}`, import.meta.url)), false, f);
  }
});

test('wordmark is Jacquard, headings and buttons carry weight 700', () => {
  const text = css();
  assert.match(text, /font-family: 'Jacquard 12', serif/);
  assert.match(text, /\.caps \{[^}]*font-weight:\s*700/);
  assert.match(text, /\.plaque \{[^}]*font-weight:\s*700/);
});
