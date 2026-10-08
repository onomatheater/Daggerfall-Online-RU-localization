# RuDaggerfall Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить переключаемую RU-локализацию в daggerfall-js-source без поломки EN, сейвов и мультиплеера.

**Architecture:** Новый слой `src/locale/` (таблица строк + ICU-плюралы/падежи), вендорный Handjet 400/500/700 (cyrillic+latin) для DOM и SDF-атласа классического текста; контент RU портируется из Jagget «Daggerfall in Russian» (Nexus 511) как данные, сеть и сейвы остаются на ID.

**Tech Stack:** JS (Vite), Node test runner (`npm test`), WebGL2 SDF-текст (`src/ui/text.js`), DOM UI (`src/ui/*`), Handjet OFL woff2/ttf, ICU MessageFormat-lite.

**Spec:** Дизайн согласован в чате 2026-10-08: шрифт Handjet 400+ (100–300 запрещены — точки), правило «сеть=ID», fallback EN, морфология запеканием форм. Отдельного spec-файла нет — план и есть спецификация.

## Global Constraints

- Дефолт EN попиксельно не меняется: `npm run check` (lint+test+build) зеленный.
- Веса Handjet только 400/500/700; 100/200/300 запрещены.
- Лицензии: только OFL (Handjet, Pixelify, Press Start 2P); `Pixel Cyrillic VM Studio` запрещен (personal use).
- Сеть (`server/src/relay.js`, `src/net/*`) и `SaveData.txt` — только ID/ключи, ноль локализованных строк.
- Строки с разметкой `[/center]`, `%pcn`, `%di`, `<-->` не переводить внутри тегов.

## Review Focus

- Русская строка длиннее английской в 1.3x — окно/кнопка должна переносить или скроллить, а не обрезать.
- Отсутствующий глиф в атласе должен дать `?`, а не пробел-молчание или краш.
- `Ё/ё` обязательна везде (имена, месяцы); фолбэк без `ё` считается багом.
- Старый сейв/релей `worldXXX` без RU-полей обязан открываться и играться на EN.
- Склонение месяца в дате («15 Января», а не «15 Январь») обязано работать через `date`+`case`, а не хардкодом.

---

### Task 1: Скелет `src/locale/` + `t()`

**Files:**
- Create: `src/locale/locale.js`
- Create: `src/locale/en.json`
- Create: `src/locale/ru.json`
- Create: `test/locale.test.js`
- Modify: `src/main.js` (инициализация локали, флаг `?lang=ru`, без смены дефолта)

**Interfaces:**
- Consumes: ничего (первая задача).
- Produces: `t(key, params='en'|'ru') -> string`, `setLocale('en'|'ru')`, `getLocale() -> 'en'|'ru'`; fallback на EN при отсутствии ключа.

- [ ] **Step 1: Write the failing test**

```js
// test/locale.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLocale } from '../src/locale/locale.js';
test('fallback EN when RU key missing', () => {
  setLocale('ru');
  assert.equal(t('customName'), 'Custom name: ');
});
test('RU override works', () => {
  setLocale('ru');
  assert.equal(t('youSee'), 'Вы видите %s.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/locale.test.js`
Expected: FAIL with "Cannot find module '../src/locale/locale.js'"

- [ ] **Step 3: Write minimal implementation**

```js
// src/locale/locale.js
import en from './en.json' with { type: 'json' };
import ru from './ru.json' with { type: 'json' };
const tables = { en, ru };
let cur = 'en';
export const setLocale = (l) => { cur = tables[l] ? l : 'en'; };
export const getLocale = () => cur;
export function t(key, params = {}, locale = cur) {
  let s = tables[locale]?.[key] ?? tables.en[key] ?? key;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v)).replaceAll('%s', String(v));
  return s;
}
```

```json
// src/locale/en.json
{ "customName": "Custom name: ", "youSee": "You see %s.", "cannotFloat": "You cannot float." }
// src/locale/ru.json
{ "youSee": "Вы видите %s." }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/locale.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/locale/locale.js src/locale/en.json src/locale/ru.json test/locale.test.js
git commit -m "feat(locale): skeleton t() with EN fallback"
```

### Task 2: Вендор Handjet 400/500/700 + DOM-стек

**Files:**
- Create: `vendor/handjet/*-cyrillic-latin.woff2` (self-host, fontsource)
- Modify: `src/ui/pixelifyFive.js` (новый `HANDJET_STACK`, `@font-face` cyrillic+latin)
- Modify: `src/ui/enhancedStyle.js` (переключить enhanced-поверхности на Handjet-стек, smoothing как у Pixelify)
- Test: `test/handjet-stack.test.js` (юнит на наличие `@font-face` cyrillic unicode-range и запрет весов 100-300)

**Interfaces:**
- Consumes: `getLocale()` из Task 1 (шрифт грузится всегда, локаль решает сабсет-приоритет).
- Produces: `HANDJET_STACK`, `HANDJET_FACE` (строка CSS для инжекта в 5 листов как `PIXELIFY_FIVE_FACE`).

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDJET_FACE, HANDJET_STACK } from '../src/ui/pixelifyFive.js';
test('handjet face covers cyrillic, no thin weights', () => {
  assert.match(HANDJET_FACE, /U\+0400-04FF/);
  assert.match(HANDJET_STACK, /Handjet/);
  assert.doesNotMatch(HANDJET_FACE, /100|200|300/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/handjet-stack.test.js`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```js
export const HANDJET_FACE = `@font-face{font-family:'Handjet';font-weight:400 700;font-display:swap;src:url(/vendor/handjet/handjet-cyrillic-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0400-04FF,U+0500-052F;}`;
export const HANDJET_STACK = `'Handjet','Pixelify Sans',monospace`;
```

Скачать: `@fontsource/handjet` пакеты 400/500/700, склеить cyrillic+latin woff2 в `vendor/handjet/`, лицензия OFL рядом (`OFL.txt`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/handjet-stack.test.js`
Expected: PASS + визуально фраза `Кк Ыы Жж Ээ Юю — Стальной меч, 15 Января` в чате (`play/?lang=ru`) без `?`.

- [ ] **Step 5: Commit**

```bash
git add vendor/handjet src/ui/pixelifyFive.js src/ui/enhancedStyle.js test/handjet-stack.test.js
git commit -m "feat(font): vendor Handjet 400+ cyrillic, DOM stack"
```

### Task 3: SDF-атлас классического текста с кириллицей

**Files:**
- Modify: `src/ui/text.js` (`SDF_CODES`: добавить `0x0400..0x045F` + `Ё 0x0401/0x0451`; `buildSdfFace` на Handjet TTF)
- Modify: `src/formats/fntFile.js` (константа `FNT_EXTRA_CODES`, классический путь без изменений для EN)
- Test: `test/sdf-cyrillic.test.js`

**Interfaces:**
- Consumes: `HANDJET` TTF-байты из Task 2.
- Produces: `sdfHas(code) -> bool` для `U+0410..U+044F, Ёё`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sdfHas } from '../src/ui/text.js';
test('sdf covers Кк Ыы Ёё', () => {
  for (const ch of ['К','к','Ы','ы','Ё','ё','Ж','ж']) assert.equal(sdfHas(ch.codePointAt(0)), true);
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `npm test -- test/sdf-cyrillic.test.js`, Expected: FAIL.
- [ ] **Step 3: Write minimal implementation** — расширить сид кодов лица (`:707-716` в DFU-порте) кириллицей из Handjet TTF 400; неизвестный код → `?` (`FNT_ERROR_CODE`), не пробел.
- [ ] **Step 4: Run test to verify it passes** — Run: `npm test -- test/sdf-cyrillic.test.js`, Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(font): SDF atlas covers Cyrillic, unknown->?"`

### Task 4: Порт Jagget — `Internal_Strings` (без логики)

**Files:**
- Modify: `src/locale/ru.json` (append 900+ ключей; `Key` не переименовывать, только `Value`)
- Create: `tools/jagget-import.mjs` (CSV `Key,Value` → json, strip `\r\n` внутри RSC по правилу `DaggerfallStringTableImporter.cs:186-188`)
- Test: `test/jagget-strings.test.js` (спот-чек 20 ключей: `youSee`, `cannotFloat`, `climbingMode:371`, `materialIneffective:56`)

**Interfaces:**
- Consumes: `t()` из Task 1.
- Produces: заполненный `ru.json`; скрипт идемпотентен.

- [ ] **Step 1: Write the failing test** — `assert.equal(t('climbingMode',{},{'ru'}), <ожидаемый RU>)`.
- [ ] **Step 2: Run** — FAIL (ключа нет).
- [ ] **Step 3: Implement** — скачать Jagget 2.3.0 (Nexus 511, 7 файлов) вручную в `C:/temp/jagget/`, прогнать `node tools/jagget-import.mjs --src C:/temp/jagget --out src/locale/ru.json`, проверить UTF-8 без BOM, разрешение автора зафиксировать в `docs/ATTRIBUTION.md`.
- [ ] **Step 4: Run** — PASS + `npm run check` зеленный.
- [ ] **Step 5: Commit** — `git commit -m "feat(ru): import Jagget Internal_Strings"`

### Task 5: Предметы / заклинания / имена (склоняемые сущности)

**Files:**
- Modify: `src/systems/quest/item.js` (`ITEM_GROUP_NAME_BY_CLASS`), `src/characters/enemyBasics.js` (`enemyDisplayName`), `src/characters/nameHelper.js`
- Modify: `src/locale/ru.json` (словарь `{nom, gen}` минимум)
- Test: `test/ru-nouns.test.js`

- [ ] **Step 1: Test** — `displayName('Steel','cuirass','ru')` → `Стальная кираса` (род от вещи, не от материала); `displayName(...,'gen')` → `Стальной кирасы`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** — словарь рода по `templateId`, материал как прилагательное согласуется; fallback EN.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**.

### Task 6: Квесты / книги / RSC / карта (`-LOC` подход DFU)

**Files:**
- Create: `src/locale/ru/quests/*-LOC.txt` (только `QRC:`, `QBN:` удалить), `src/locale/ru/books/*-LOC.txt`
- Modify: `src/formats/rscTable.js` (`INTERNAL_RSC_RU` overlay, `parseRscMarkup` уже есть — переиспользовать), `src/formats/textRsc.js` (сначала RU-таблица, потом EN, потом файл — как `TextProvider.cs:167-188`)
- Test: `test/ru-quests.test.js` (макросы `%pcn`, `%di`, `[//center]` целы после перевода)

- [ ] **Step 1: Test** — взять `M0B00Y16` + RU-вариант, `assert(render(qrc_ru).includes('%pcn'))`.
- [ ] **Step 2-5:** FAIL → импорт 3–5 квестов + 2 книг из Jagget как пилот → PASS → commit.

### Task 7: Сетевой аудит — только ID (твой вопрос про чат)

**Files:**
- Modify: `src/net/chat.js`, `src/net/tradeSession.js`, `src/net/online.js` (`prepareQuestShare`), `src/net/productRecord.js`
- Test: `test/net-locale.test.js`

- [ ] **Step 1: Test**

```js
test('chat item link sends id, renders per-locale', () => {
  const wire = toWire({ templateId: 'steel_cuirass', kind: 'itemLink' });
  assert.equal(wire.text, undefined); // строку слать запрещено
  assert.equal(renderLink(wire, 'ru'), 'Стальная кираса');
  assert.equal(renderLink(wire, 'en'), 'Steel Cuirass');
});
```

- [ ] **Step 2: Run** — FAIL (если линка нет — сначала ввести `kind:'itemLink'` как новый фрейм, gated `RU_LINK_MIN`, старые релеи дропают молча).
- [ ] **Step 3: Implement** — запрет `text` для линка; имя только из локального словаря Task 5.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**.

### Task 8: Морфология — ICU + запекание (качественно)

**Files:**
- Modify: `src/locale/locale.js` (`plural(count, one/few/many)`, `select(gender)`, `dateCase`)
- Create: `tools/bake-ru-forms.mjs` (генерит формы из словаря; рантайм без pymorphy)
- Test: `test/ru-morph.test.js` (`1 книга / 2 книги / 5 книг`; `15 Января`; `Стальным мечом` (твор.))

- [ ] Steps: FAIL → implement → PASS → commit. Формат: `{count, plural, one {# книга} few {# книги} many {# книг}}`.

### Task 9: PR-пакет в апстрим

**Files:**
- Create: `docs/ATTRIBUTION.md` (Jagget, Handjet OFL, Rosetta), `ru-pack.zip` сборка (`tools/pack-ru.mjs`: `ru.json + quests-LOC + books-LOC + fonts`)
- Modify: `README.md` (секция `?lang=ru`, скрин `Кк Ыы`)

- [ ] Steps: собрать zip → проверить на чистом клоне `main` → открыть PR `feat: optional RU locale pack (Handjet, ID-only net)` → commit.
