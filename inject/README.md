# Встройка RU-пака в клиент

Два исхода — один адаптер (`inject/locale-adapter.js`):
- разработчики говорят «давайте в апстрим» — файл ложится в `src/locale/` клиента как есть;
- говорят «только внешний оверлей» — тот же файл грузится первым скриптом поверх сборки.

## Как врапить (механика)

```js
// было (src/scenes/hostMagic.js): NO_SPELLBOOK_TEXT = 'You have no spellbook!';
import { wrapLiteral } from 'locale-adapter.js';
const NO_SPELLBOOK_TEXT = () => wrapLiteral('spells:nospellbook' /* ключ по аудиту */);
```

```js
// было (src/scenes/corpseMarker.js:149): const line = `${name} just died.`;
const line = wrapTemplate('strings:thingJustDied', { s: name });
```

## Загрузка из Prefs/Locale (иммунитет к обновлению игры)

Перевод лежит вне сборки — `Prefs/Locale/ru/` рядом с сейвами (апдейтер игры
их не трогает). Старт игры (буквально, `node:fs` в бандле нет — только fetch):

```js
// src/main.js клиента (или его boot-модуль):
import { registerPack, setGameVersion, setLocale } from './locale/locale-adapter.js';
setGameVersion(gameVersion); // dotted '0.1.8127' — канон сведёт сам
const [manifest, tables] = await Promise.all([
  fetch('/Prefs/Locale/ru/locale-version.json').then((r) => r.json()),
  fetch('/Prefs/Locale/ru/ru.json').then((r) => r.json()),
]);
const pack = registerPack({ manifest, tables }); // {ok:false} → остаёмся на EN
if (pack.ok) setLocale('ru'); // ре-рендер, сеть молчит, сейвы — только ID
```

Та же механика покрыта тестом без браузера: `loadExternalPackFetch()`
(`src/locale/loader.js`, `test/overlay-external-fetch.test.js`) — fetchJson
инжектится, отказ `{ok:false}`, никогда throw. RISK: как именно браузерный
клиент дотягивается до папки Prefs (file:// vs протокол Electron) — решает
апстрим, адаптер путь не зашивает (baseUrl — параметр).

## Якоря (первые 5 точек — исторический пример механики, 11.10)

> Актуальная очередь и drift-контроль — `tools/probe-queue.json` +
> `tools/probe-rebase.mjs`; слои системы — AGENTS §4. Ниже — исходный
> пример врезки, строки/номера могут дрейфовать с апстримом.

1. `src/scenes/hostMagic.js:41` — `'You have no spellbook!'` → таблица spells/strings.
2. `src/scenes/corpseMarker.js:149` — `` `${name} just died.` `` → `strings:thingJustDied`.
3. `src/scenes/world.js:13948` — `'You cannot save now.'` → `strings:cannotSaveNow`-класс ключей.
4. `src/player/activate.js:44` — `youSee,You see %s.` → `strings:youSee`.
5. `src/player/climbing.js:186` — `Internal_Strings.csv:371 climbingMode` → дословно.

## Правила, неснимаемые любым ответом

- Сеть и сейвы — только ID (см. `src/net/link.js`). Переключатель языка — чисто
  клиентское состояние, ре-рендер + инвалидация SDF-атласа, без переподключения.
- Нюанс кавычек: DFU-значения иногда в кавычках, клиент рисует без — решает call
  site, адаптер не правит текст.
- SDF-атлас: сид из `src/font/coverage.js` скормить в `buildSdfFace()` (`src/ui/text.js`
  клиента) рядом с `vendor/handjet` TTF.
