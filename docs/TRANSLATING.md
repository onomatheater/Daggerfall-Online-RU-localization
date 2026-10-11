# Translating Daggerfall Online to Other Languages

This repo holds a Russian (RU) localization overlay for
[Daggerfall Online](https://github.com/Lattymoy/daggerfall-js-source)
(the web + desktop client). It is structured so any language can reuse
the machinery: string tables, extractor, validator, probe chain. This
guide shows how (example: Spanish).

## Architecture (what you copy)

- `src/locale/locale.js` — tiny loader: `t('table:key')` + `tOr(key, fallback)`.
  Missing key = English text + console warning. Never `?`, never a crash.
- `src/locale/en.json` — master tables: classic `strings`, DFU data tables,
  and `dfo:` (the client's own UI strings, namespaced `dfo:<page>.<slug>`).
- `src/locale/ru.json` — same key sets, translated values. **Keys are stable:
  never rename a key, only translate the value.**
- `tools/extract-texts.mjs` — finds hardcoded UI strings in `src/ui/` and
  rewrites them to `t()` calls (safe side: IDs, classes, code fragments are
  skipped; suspects are flagged `code-const`/`template-part` for human review).
- `tools/ru-scan.mjs` — mechanical QA (spelling/diacritics, mixed scripts,
  whitespace parity). Adapt the checks to your language or write your own.
- `skills/ru-localization-qa/` — the RU quality gate (glossary → back-translation
  → register → consistency → placeholders)._TS: replicate the discipline, not the file._

## Adding a language (say ES)

1. Copy `src/locale/en.json` → `src/locale/es.json`. Keep every key.
2. Wire the locale list in `src/locale/locale.js` (`tables = { en, ru, es }`)
   and expose a language switch that only **re-renders open surfaces**
   (never restart the session, reconnect, rewrite saves, or touch `worldXXX`
   protocol versions; in-flight trade/cast/quest frames finish in the old language).
3. Translate values only. Rules that prevent desync and breakage:
   - Network, saves and quest logic carry **IDs/keys only** (`templateId`,
     `questName`). A localized string must never be persisted or sent.
   - Never translate markup/macros: `[/center]`, `%pcn`, `%di`, `%s`, `<-->` stay.
   - Never translate proper nouns, file paths, ini sections/keys, versions.
   - Placeholders must match 1:1 (`{title}`, `%s`).
   - Grammar via ICU (`{count, plural, ...}`, `{gender, select}`), never
     `if (n==1)` in shipped strings; month/case forms go in the dictionary.
   - UTF-8 without BOM.
4. Fonts: vendor an OFL-licensed font under `vendor/<family>/` that covers your
   script (we use Handjet for Cyrillic). Verify the license file + subset with
   a parser, not by eye. Pixel text: weight ≥ 600, size ≥ 14px. Unknown glyph
   must render `?`, never vanish silently.
5. Validate: missing-key fallback works (EN + warning), tables scan clean,
   `npm test` green. For an upstream PR, EN screenshots before/after must be
   pixel-identical.

## Scope note (one-time patch)

This overlay was built against a client updating ~10×/day with no
localization hook, so it ships as an **external one-shot patch**: strings are
decoupled locally (`ruTOr('dfo:key', 'EN fallback')` at render sites, tables
as data), the game is translated, and that is the end of it — no tracking of
upstream. If the upstream team wants a maintained integration (a real `t()`
with a locale switch that survives updates), the tables + extractor + this
guide are the starting point — contact the repo owner.

## Status pointer

Pre-character-creation menu (door/rails/settings/account/save-load/dialogs/
launcher) is fully translated in RU and verified on screen; character creation
uses classic `BIOG` data (separate pipeline). See `src/locale/en.json` (`dfo:`
+ `save.`/`account.`/`dlg.`/`acct.`/`tier.` prefixes) for the covered set.
