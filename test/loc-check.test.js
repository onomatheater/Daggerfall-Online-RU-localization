import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuestPair, checkBook } from '../tools/loc-check.mjs';

const SRC = `Quest: M0B00Y16
QRC:
Message: 1010
<ce> You have no problems with the law
<ce> in region %crn.
<-->
<ce> Second variant %pcn.
QBN:
Clock _q0_ 12:00 1 _end_ else _start_
`;

test('quest pair: macros and variants must survive translation', () => {
  const good = `Quest: M0B00Y16
QRC:
Message: 1010
<ce> У вас нет проблем с законом
<ce> в регионе %crn.
<-->
<ce> Второй вариант %pcn.
`;
  assert.deepEqual(checkQuestPair(SRC, good), []);
});

test('quest pair: lost macro, lost variant, changed id reported', () => {
  const bad = `Quest: M0B00Y16
QRC:
Message: 1010
<ce> У вас нет проблем с законом
<ce> в регионе.
`;
  const errs = checkQuestPair(SRC, bad);
  assert.ok(errs.some((e) => e.includes('%crn')), 'lost macro, got: ' + errs);
  assert.ok(errs.some((e) => e.includes('%pcn')), 'lost variant macro');
  assert.ok(errs.some((e) => e.includes('variant')), 'variant count');
});

test('quest pair: QBN logic must not be shipped', () => {
  const withQbn = `Quest: M0B00Y16
QRC:
Message: 1010
<ce> Текст %crn.
QBN:
Clock _q0_ 12:00 1 _end_ else _start_
`;
  assert.ok(checkQuestPair(SRC, withQbn).some((e) => e.includes('QBN')));
});

test('book: tags intact, markup intact', () => {
  const errs = checkBook('Title: X\nAuthor: Y\n[/center]Текст[/center]\n', 'Title: Х\nAuthor: Y\n[/center]Текст[/center]\n');
  assert.deepEqual(errs, []);
  const bad = checkBook('Title: X\n[/center]Текст[/center]\n', 'Заголовок: Х\nТекст\n');
  assert.ok(bad.some((e) => e.includes('Title:')), 'tag translated: ' + bad);
  assert.ok(bad.some((e) => e.includes('[/center]')), 'markup lost');
});
