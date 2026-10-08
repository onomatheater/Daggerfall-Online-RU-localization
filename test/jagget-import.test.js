import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, csvToJson } from '../tools/jagget-import.mjs';

test('parses Key,Value with quotes, commas and multiline', () => {
  const rows = parseCsv('Key,Value\r\nyouSee,"You see %s."\r\nthingJustDied,"%s погиб."\r\nmulti,"line1\r\nline2, with comma"\r\n');
  assert.deepEqual(rows, [
    { key: 'youSee', value: 'You see %s.' },
    { key: 'thingJustDied', value: '%s погиб.' },
    { key: 'multi', value: 'line1\r\nline2, with comma' },
  ]);
});

test('strips BOM and unescapes doubled quotes', () => {
  const rows = parseCsv('﻿Key,Value\r\nq,"сказал ""привет"""\r\n');
  assert.deepEqual(rows, [{ key: 'q', value: 'сказал "привет"' }]);
});

test('csvToJson keeps keys stable, values only', () => {
  assert.deepEqual(csvToJson([{ key: 'saveGame', value: 'Сохранить игру' }]), { saveGame: 'Сохранить игру' });
});
