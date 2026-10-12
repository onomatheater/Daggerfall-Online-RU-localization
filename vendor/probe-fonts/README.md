# Шрифты пробо-цепочки (только для сборки пакетов, не для игры напрямую)

Файлы, которые патч-скрипты (`patch-fontfull`, `patch-ps2p`, `patch-guild`,
`patch-sdf`) читают из `public/fonts/` дерева и инлайнят в base64:

- `Handjet-full.ttf` — полный Handjet (Rosetta, OFL). Взят из прежних
  пробных сборок на этой машине; cmap-парсером проверено: кириллица
  (U+0400–045F и др.) + латиница на месте (12.10).
- `ps2p-full.ttf` — Press Start 2P (CodeMan38, OFL, только цепочка пробы).
  Источник тот же; кириллица+латиница проверены парсером (12.10).

Честная оговорка: первоисточник этих двух файлов (чья сборка TTF)
не задокументирован — отложено на clean-room регенерацию из Google Fonts.
До неё: конвейер сверяет sha256 с зафиксированными ниже, подмена видна.

```
Handjet-full.ttf  283912 bytes
ps2p-full.ttf     118204 bytes
handjet-cyrillic-600-normal.woff2 4808 bytes
handjet-latin-600-normal.woff2    7320 bytes
```

600-сабсеты проверены через wawoff2+cmap (12.10): cyrillic-only и
latin-only как названы. guildenstern.ttf побайтово равен
`vendor/guildenstern-nbp/GuildensternNbp.ttf`.

Шесть woff2 Handjet лежат в `vendor/handjet/`, Guildenstern — в
`vendor/guildenstern-nbp/` (там же ATTRIBUTION).
