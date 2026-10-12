# Вендор лаунчера разработчиков

Файлы в `updater/launcher/` (`index.html`, `launcher.js`, `launcher.css`,
`fonts/`) — из репозитория Lattymoy/daggerfall-js-source (MIT License,
Copyright (c) 2026 Lattymoy), побайтовая копия на 12.10.2026.

Что меняем под себя (остальное — их код как есть):
- шрифтовые стеки: их латиница + наши кириллические Handjet/Guildenstern
  (иначе русский текст падает в monospace);
- панели: новости паков вместо новостей игры, пак вместо setup-карты;
- мост и состояние: наше `viewOf` (пак) вместо их `launcherState.cjs` (игра).

`pad.js`/`menuPad.js` не забирали сознательно: геймпад-петля игровых меню,
апдейтеру перевода не нужна.

## updater/vendor-dfo/updateCheck.cjs

Чистое сравнение версий из их `app/lib/updateCheck.cjs` (MIT) — побайтово.
Наша notice-проверка игры (новее ли тег): `checkGameUpdate` в
`updater/lib/flow.js`. Игру не трогаем — только баннер и кнопка.
