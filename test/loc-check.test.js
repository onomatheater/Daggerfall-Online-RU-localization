import test from 'node:test';
import assert from 'node:assert/strict';
import { checkQuestPair, checkBook, checkBiogPair } from '../tools/loc-check.mjs';

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
  assert.ok(bad.some((e) => e.includes('markup')), 'markup lost');
});

test('book: font number may change, tags may not drop', () => {
  assert.deepEqual(checkBook('[/font=2]\n[/center]T\n', '[/font=1]\n[/center]Т\n'), []);
  assert.ok(checkBook('[/font=2]\n[/center]T\n', '[/center]Т\n').some((e) => e.includes('markup')));
});

const BIOG_SRC = `1.\tWhat school of magic?
a.\tDestruction
\t#4150
\t!4156
\t22 +6
b.\tRestoration
\t#4151
\t!4157
\t23 +6
2.\tWhat motivates you?
a.\tRiches
\t#4162
\t!4263
\tGP +500
`;

const BIOG_GOOD = `1.\tКакая школа магии?
a.\tРазрушение
\t#4150
\t!4156
\t22 +6
b.\tВосстановление
\t#4151
\t!4157
\t23 +6
2.\tЧто движет тобой?
a.\tБогатство
\t#4162
\t!4263
\tGP +500
`;

test('biog pair: prose translates, logic byte-identical', () => {
  assert.deepEqual(checkBiogPair(BIOG_SRC, BIOG_GOOD), []);
});

test('biog pair: changed logic line, dropped answer, moved letter reported', () => {
  const badLogic = BIOG_GOOD.replace('\t22 +6', '\t22 +7');
  assert.ok(checkBiogPair(BIOG_SRC, badLogic).some((e) => e.includes('logic')), 'logic drift: ' + checkBiogPair(BIOG_SRC, badLogic));
  const dropped = BIOG_GOOD.split('\n').filter((l) => !l.startsWith('b.\t')).join('\n');
  assert.ok(checkBiogPair(BIOG_SRC, dropped).some((e) => e.includes('line count') || e.includes('answer')), 'dropped answer');
  const moved = BIOG_GOOD.replace('b.\tВосстановление', 'c.\tВосстановление');
  assert.ok(checkBiogPair(BIOG_SRC, moved).some((e) => e.includes('letter') || e.includes('answer')), 'moved letter');
});
