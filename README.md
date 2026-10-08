# Daggerfall Online — русская локализация

> **Первоисточник игры:** https://github.com/Lattymoy/daggerfall-js-source (Daggerfall Online — open-source реимплементация TES II: Daggerfall, логика портирована из Daggerfall Unity, MIT). Играть в оригинал: https://daggerfalljs.dev/ (`/play/`). **Этот репозиторий — независимый RU-оверлей, не форк игрового клиента и не сервер: сетевой протокол и баланс не трогаем, конфликтов с оригиналом нет.**

[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Русский языковой пакет + инфраструктура переключения языка для Daggerfall Online. Дефолт игры — английский; RU включается флагом/переключателем и ни один английский пиксель по умолчанию не меняется.

## Ссылки

- Игра (апстрим): https://github.com/Lattymoy/daggerfall-js-source
- Daggerfall Unity (источник логики и формата локализации): https://github.com/Interkarma/daggerfall-unity
- Гайд по переводу DFU: https://github.com/Interkarma/daggerfall-unity/wiki/Translating-Daggerfall-Unity
- Контент-источник RU-строк: Jagget «Daggerfall in Russian» (Nexus mods/511) — используется как данные, с атрибуцией в `docs/ATTRIBUTION.md`, только с разрешения автора
- Шрифт: Handjet (Rosetta, OFL-1.1) — `vendor/handjet/`, веса только 400/500/700
- Форум переводов DFU: https://forums.dfworkshop.net/viewforum.php?f=26

## Установка (игроку)

1. Скачай `ru-pack.zip` из Releases.
2. Веб: открой игру с `?lang=ru` или выбери «Язык: Русский» в настройках (когда переключатель вмержен в апстрим).
3. Десктоп: распакуй пак в `Prefs/Locale/ru/` рядом с сейвами. Сейвы (`SaveData.txt` DFU-формата) не трогаются — в них лежат ID, не строки.
4. Обновление: замени zip на новый из Releases; версия пака видна в настройках (`locale-version.json`).

## Для разработчика

- `src/locale/locale.js` — `t(key, params, locale)`, `setLocale()`, `getLocale()`; fallback EN.
- `src/locale/en.json` — ключи-источники (verbatim EN апстрима). `src/locale/ru.json` — только `Value` на русском, `Key` не переименовывать.
- Тесты: `node --test test/` (движок Node ≥ 20). План: `docs/superpowers/plans/2026-10-08-rudaggerfall-localization.md`.
- Правила: см. `AGENTS.md` (политика Pay once: ID внутри, текст только на рендере; сеть и сейвы — только ID).

## Статус

- [x] Task 1: скелет `t()` с fallback EN
- [ ] Task 2: Handjet-вендор + DOM-стек
- [ ] Task 3–9 по плану
