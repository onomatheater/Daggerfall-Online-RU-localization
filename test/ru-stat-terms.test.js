import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLocale } from '../src/locale/locale.js';

const ru = JSON.parse(fs.readFileSync(new URL('../src/locale/ru.json', import.meta.url), 'utf8'));

test('weight terms split by context', () => {
  setLocale('ru');
  assert.equal(t('dfo:menu.burden'), 'Нагрузка');
  assert.equal(t('dfo:menu.encumbrance'), 'Переносимый вес');
  setLocale('en');
});

test('no mangled Magicka transliterations anywhere', () => {
  const bad = [];
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') {
        if (/магика|мэджик/i.test(v)) bad.push(`${path}:${k}=${v}`);
      } else if (v && typeof v === 'object') walk(v, `${path}:${k}`);
    }
  };
  walk(ru, 'ru');
  assert.deepEqual(bad, []);
});
