# Locale data and mechanics

This guide describes the code in this repository as of 2026-10-14. The current runtime is RU-specific; it is not evidence that a new locale is already supported. See [Architecture](ARCHITECTURE.md) and [Known Gaps](KNOWN-GAPS.md) for integration and delivery limits.

## Tables, keys, and fallback

Locale data is JSON organized by table and key. A key may be written as `table:key`; an unqualified key uses the `strings` table. The bundled files include the classic `strings` table, other source-data tables, and `dfo` keys for this project’s own UI. Keep established keys stable and change their values rather than renaming them.

The product resolver in [`src/locale/locale.js`](../src/locale/locale.js) currently registers only `en` and `ru`. For the active locale, `t()` checks that locale’s table first and then the English table. If neither contains the key, it warns and returns the raw key. An unknown locale passed to `setLocale()` warns and resets to English. An absent RU value with an EN value is a normal English fallback, not a missing-key warning.

Examples checked against the exports and tests:

```js
t('strings:youSee', { s: name });
tp('dfo:menu.sync_go', 1);
```

`t(rawKey, params = {}, locale)` resolves a value and applies parameters to strings. If the value is an object, `t()` returns that object unchanged. `tp(rawKey, n, params = {}, locale)` is the plural-rendering path for baked form objects. `setLocale()` and `getLocale()` control/read bundled locale state; they do not themselves redraw client UI. `hasKey()` reports a key present in the requested/current locale or English.

## Parameters and baked forms

[`src/locale/params.js`](../src/locale/params.js) replaces each `%s` in order using the values of `params`. A single `%s` commonly uses `{ s: value }`; multiple `%s` placeholders can use ordered numeric keys such as `{ 0: first, 1: second }`. Named placeholders such as `{name}` are replaced by matching properties. Preserve placeholder spelling and meaning when translating.

Plural data is stored as an object of already-written forms, not assembled through runtime inflection. For example:

```json
{ "one": "# setting", "few": "# settings", "many": "# settings" }
```

`tp(key, count, params, locale)` selects a form and replaces `#` with the count, then applies remaining named parameters. The implementation in [`src/locale/morph.js`](../src/locale/morph.js) is **not a general ICU parser**: it does not parse ICU message syntax or decide arbitrary locale grammar. Its numeric selector is the RU rule: `one` for final digit 1 except 11, `few` for final digit 2–4 except 12–14, and `many` otherwise. Non-finite input warns and falls back to `many` (or `other` if present). The rule is currently hard-coded and is used by the plural helper regardless of the selected language; it must not be assumed correct for another locale.

The same module exports `select(key, forms)`, a simple object lookup (`forms[key]`, then `forms.other`); it is not ICU `{gender, select, ...}` parsing. It warns and returns an empty string only when neither selected form nor `other` exists. These helper exports are in `morph.js`; `locale.js` exports `t()` and `tp()`, not `select()`.

## Month data and RU assumptions

Month forms live in each dictionary’s `months` object, indexed by strings `"0"`–`"11"`, with fields `nom`, `gen`, `dat`, `acc`, `inst`, and `prep`. `month(index, case)` reads the RU value first and falls back to EN; English data repeats its month name across cases. An invalid case warns and uses `nom`; a missing month/case warns and returns an empty string. This helper currently reads RU/EN dictionaries directly and has no locale argument. It is not a general case-inflection mechanism. Put supported grammatical forms in data rather than adding runtime morphology.

## Markup, macros, and text files

Translate prose around formatting and game tokens; do not translate, remove, or invent structural markup/macros. In particular, preserve `[/center]`, `[/record]`, `[/end]`, `%pcn`, `%di`, `%s`, and `<-->` exactly where required by the source. Other `%` macros, `Message:` identifiers, book headers, and quest structure also have format-specific contracts. The validators and tests check selected constraints; they do not infer all semantic correctness.

For quest `-LOC` files, translate `QRC:` text only. Do not edit or ship `QBN:` quest logic; the source supplies logic. Keep corresponding message IDs and the source’s macros/variants/markup. For books, preserve structural fields and markup. See [`tools/loc-check.mjs`](../tools/loc-check.mjs) and its tests for the checks implemented here.

Tracked `*.json`, `*.txt`, and `*.csv` localization data must be UTF-8 without a byte-order mark. Keep JSON valid and retain the source key structure. Do not assume that a packaged `-LOC` file is loaded by the client; the external loading path remains unverified.

## Fonts

The checked-in Handjet face currently includes weights 400, 500, and 700 and declares Cyrillic and Latin ranges. The SDF coverage seed in `src/font/coverage.js` is Cyrillic-oriented. Existing tests verify these declarations, Cyrillic-oriented seed coverage, font files, and the Handjet OFL file; they do not prove German glyph cmap coverage or rendered output in the game client. Do not advertise German font support without those checks. Font changes must use the vendored family’s allowed weights and preserve its license/attribution requirements.

## Adding another locale

Adding `de.json` or another translated JSON file alone does **not** make a supported locale. The runtime table, locale-specific plural/select/month behavior, external manifest and loader, adapter registration, RU-specific package builder/files, font coverage, validation, and client integration would need deliberate code and pipeline work, with tests. Decide locale rules with that locale’s maintainers; this guide does not prescribe German plural rules or glossary choices. Until that work and client verification exist, unsupported locale IDs fall back to English.
