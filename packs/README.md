# Паки перевода (раздача с main)

Лаунчер тянет перевод отсюда: `packs/feed.json` + свежий zip.
URL фида зашит в апдейтер (`DEFAULT_FEED_URL` в `updater/lib/flow.js`).

## Политика (решение человека 12.10)

- В `main` лежит ТОЛЬКО свежий пак: `packs/dfo-ru-pack.zip` + `packs/feed.json`
  с одной записью. Пак заявляет пол (`gameMin`), не точную сборку: на новее —
  ставится, новые ключи падают в EN + очередь синка. Старые версии остаются
  в истории git, в рабочую копию не едут. Старая игра без совместимого пака
  остаётся на английском — это честный `no-compatible`, не поломка.
- Рецепт возврата перевода после обновления игры — рядом:
  `packs/recipe-<game>.zip` + ссылка `recipe: {url, sha}` в записи фида.
  Один пак — один рецепт под его `game`.

## Как выпустить пак (руками, CI нет)

1. `node tools/pack-ru.mjs` — собрать пак (гейт `verify-pack` внутри).
2. Упаковать директорию пака в `packs/dfo-ru-pack.zip`.
3. `node tools/dist-recipe.mjs --vanilla <ванильный dist> --patched <наш dist> --game <версия> --out recipe.json`,
   упаковать рецепт в `packs/recipe-<версия>.zip`.
4. `node tools/release-ru.mjs --in release-items.json --out packs/feed.json`,
   где `release-items.json` — `[{zipPath, packDir, url, notes, recipe}]`
   с URL вида `https://raw.githubusercontent.com/onomatheater/Daggerfall-Online-RU-localization/main/packs/<файл>`.
   `releaseEntry` сам сверит пак и посчитает sha; битый пак — throw, частичный
   фид не публикуется.
5. Закоммитить `packs/` в `main`, запушить. Лаунчер подтянет обнову сам.

## Автоконвейер (вместо рук)

Машина сама следит за версиями игры и шьёт паки. Руки — только когда
гейты красные (якоря уплыли, сборка упала).

- `tools/game-watch.mjs` — есть ли тег новее max клейма в фиде
  (состояние и есть фид, отдельного стейта нет).
- `tools/vanilla-dist.mjs` — ванильный dist сборкой тега из исходников.
- `tools/publish-pack.mjs` — склейка: клон → ваниль → очередь патчей
  (`probe-rebase --apply`) → пропатченная сборка → маркеры → stage.
  Дефолт dry-run (только шаги, ничего не трогает).
- `tools/publish-gates.mjs` — публикация: все гейты зелёные, пишем
  только `packs/**` на `main`, дерево вне `packs/` обязано быть чистым.
- Прогон руками из корня репозитория (всё в tmp, репозиторий не трогаем
  до публикации):
  `node tools/publish-pack.mjs --run --tag app-vX --from app-vY ...`
  (точные флаги — `--help` скрипта; без `--run` только план).
- Запуск по расписанию на машине owner'а (планировщик, не CI).
  Actions отложены сознательно.
