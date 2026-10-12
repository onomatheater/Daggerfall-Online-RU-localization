# LAUNCHER — апдейтер перевода (как устроен и как с ним работать)

Отдельное Electron-приложение, не часть игры. Две задачи: ставить пак
русского перевода и замечать обновления самой игры. Игру не качает
и не правит: после ручного обновления возвращает перевод рецептом.
Правила для всех, кто правит `updater/`, `tools/*pack*`, `tools/*feed*`,
`tools/*recipe*`, `packs/`. Жанр — как `CONTRIBUTING.md`: рабочий минимум.

## Что где лежит

- `updater/main.js` — шелл окна (960×600): IPC, кнопки, скачивание.
  Напрямую не тестируется (импортирует `electron`); вся логика обязана
  жить ниже, в тестируемых модулях.
- `updater/lib/flow.js` — чистая логика без Electron: выбор пака,
  установка (sha → распаковка → гейт → стор), баннер игры, `describeIssue`,
  `isGameRunning`, `psCommand`, `isFeedConfigured`, `DEFAULT_FEED_URL`.
- `updater/lib/view.js` — `viewOf()`: состояние окна в форме движка
  разработчиков. Их `launcher/launcher.js` только рисует, решений не содержит.
- `updater/lib/migrate.js` — разовая миграция `app.asar` → `resources/app`.
  Атомарно: чужой бэкап не затираем, asar удаляется только после проверки
  (`package.json` в распакованном дереве), провал — throw, asar цел.
- `updater/lib/dist-apply.js` — применение рецепта к распакованному дереву:
  сверка delete-целей, base64 → байты, маркеры, полная сверка контента.
- `updater/lib/asar.js`, `prefs.js`, `unzip.js` — чтение версии из asar,
  префы (папка игры, автопроверка), распаковка zip.
- `updater/launcher/` — форк их окна (MIT, `NOTICE.md` на месте).
  `preload.js` — мост `launcher:view` / `launcher:act`, ссылки именованные.
- `updater/assets/` — иконка игры (MIT): `icon-src.png` + собранный
  `icon.ico` (`npm run icons` для пересборки).
- `tools/pack-ru.mjs`, `verify-pack.mjs` — сборка и гейт пака.
- `tools/feed-ru.mjs`, `release-ru.mjs` — фид: выбор совместимого пака,
  сборка `feed.json` с sha (битый пак — throw, частичный фид не публикуется).
- `tools/update-ru.mjs`, `pack-store.mjs` — установка пака, стор
  (держим 3 последних, откат — на один шаг назад).
- `tools/dist-recipe.mjs` — рецепт как diff dist-деревьев (только изменившееся).
- `tools/detect-game.mjs` — версия игры (package.json → yml → asar).
- `packs/` — раздача с `main`: `feed.json` + свежий `dfo-ru-pack.zip`
  (+ `recipe-<game>.zip`). Политика и процедура релиза — `packs/README.md`.

## Фид и совместимость

- `DEFAULT_FEED_URL` = `packs/feed.json` на `main`
  (`updater/lib/flow.js`). Стенд — `RU_FEED_URL` с локальным путём.
- Клеймо совместимости: точный `game` или диапазон `gameMin`–`gameMax`.
  Берётся новейший совместимый; нет подходящего — `no-compatible`
  (английский, игра работает). Заглушка вместо URL — `feed-unconfigured`,
  а не «нет соединения».
- sha256 обязателен для паков и рецептов (`shaProblem`): нет валидного
  sha — не ставится никак, ни сетью, ни локальным файлом.
- Рецепт — только base64 (`encoding: 'base64'`): байт-в-байт через JSON.
  Чужой shape отказывается громко (`bad recipe shape`).

## Ошибки — только по-русски

- Все причины отказов маппятся в `describeIssue` (`updater/lib/flow.js`).
  Новую причину добавил — добавь маппинг и тест в том же коммите.
- Исключение: неизвестная ошибка остаётся громкой с деталью
  (`Не получилось: ...`) — это спека, держит тест, не «чинить».
- `main.js` причину не выдумывает: `restoreFailReason(err)`.

## Сборка

```
cd updater
npm install
npm run icons   # пересборка icon.ico (обычно не нужна — закоммичен)
npm run dist    # NSIS-установщик в updater/release/, без подписи
```

- `updater/release/` в git не едет (игнор).
- Раскладка пакета: код в `app.asar`, `tools/` и `src/locale/` — через
  `extraResources` (`resources/tools`, `resources/src`). Внимание:
  записи `files: {to: ../...}` кладут `..` в хедер asar и ломают пакет —
  так делать нельзя (урок 12.10, держит сборка).
- Живой запуск Electron — только по прямому слову owner'а. Проверка
  без запуска: `npm test` + аудит импортов по собранному asar.

## Проверка перед пушем

```
npm test        # node --test "test/*.test.js", Node >= 20, всё зелёное
```

- Новое поведение — сначала падающий тест (RED посмотреть обязательно),
  потом код. Тест под новую причину/гейт — в том же коммите.
- `updater/main.js` в node-тестах не участвует; проверяемое выносится
  в `lib/` (прецеденты: `restoreFailReason`, `shaProblem`, `psCommand`).
- Статусы окна (`viewOf`) держат `test/updater-view.test.js`.

## Релиз пака

По `packs/README.md` (5 шагов), затем PR и мерж по слову owner'а.
В `main` лежит только свежий пак; старые версии — в истории git.
Пустой `packs/feed.json` (`{"packs": []}`) — нормальное состояние
до первого релиза, а не баг.
