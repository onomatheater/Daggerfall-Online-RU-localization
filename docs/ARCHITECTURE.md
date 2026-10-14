# Localization architecture

**Evidence date: 2026-10-14.** “Implemented” below means code or tests exist in this repository; it does not imply that an external game client calls that code. Evidence labels follow [Known Gaps](KNOWN-GAPS.md): **Code inspection**, **Automated test**, **Roadmap snapshot**, and **Unverified external behavior**. See that register for findings that need outside confirmation.

## Layers and status

### 1. Locale data and resolver — **Implemented in this repository**

- `src/locale/en.json` and `src/locale/ru.json` contain keyed tables. `src/locale/locale.js` statically registers only `en` and `ru`; `t()` resolves the selected locale, then English, then the raw key with a warning. `tp()` renders the repository’s baked plural-form objects.
- `params.js` substitutes `%s` and named `{name}` placeholders. `morph.js` contains RU-specific plural selection, explicit-key selection, and month lookup. These helpers are limited; they are not a general ICU engine or a locale-neutral grammar service.
- `src/locale/ru/` also contains Russian text assets, including quest/book `-LOC` files and name syllable data. Their existence is not proof that the game client loads them.
- `src/font/handjet.js` and `src/font/coverage.js` define the Handjet faces and Cyrillic-oriented SDF coverage contract. German glyph rendering is **unverified**; see [Known Gaps](KNOWN-GAPS.md#german-font-rendering-has-not-been-proved).

### 2. Client injection/adapter — **Example/proposed; client wiring unverified**

`inject/locale-adapter.js` exports adapter functions, including `wrapLiteral()`, `wrapTemplate()`, `wrapPlural()`, `setGameVersion()`, and `registerPack()`. Unit tests exercise the module. `inject/README.md` and the adapter comments show two intended destinations: placing the adapter in an upstream client integration, or loading it as an external overlay. They are integration examples, not evidence that this repository’s game client boots the adapter. Access to the client’s `Prefs/Locale` directory, boot hook, rerendering of open surfaces, and font-atlas invalidation require host-client work or confirmation.

Changing `setLocale()` changes locale-module state only. The host must redraw open UI and handle its font/SDF atlas; this repository does not implement that host behavior. In-flight trade/cast/quest guarantees are not established by the module tests.

### 3. Packaging and updater — **Pack tooling implemented; end-to-end client delivery unverified**

`tools/pack-ru.mjs` builds an RU-specific package containing `ru.json`, selected Handjet font files, and quest/book `-LOC` files. It does not include BIOG files. `src/locale/loader.js` and `tools/load-pack.mjs` load a manifest and `ru.json` into an overlay; the external loader validates `locale: "ru"`. The JSON loader does not consume the packaged `-LOC` files. Whether and where the game client consumes those files is unverified.

Updater and launcher code is present separately from locale data and pack building. A successful package build or module test does not prove installation, client startup, or update behavior in a built game. Consult the [updater guide](updater.md), [launcher guide](../LAUNCHER.md), and [Known Gaps](KNOWN-GAPS.md) for the current evidence boundary.

### 4. Upstream probes — **Probe tools implemented; live-client behavior unverified**

`tools/extract-texts.mjs` exports extraction and rewrite helpers for UI display literals. It skips likely identifiers/code, reports risk cases, and generates `ruT(...)` calls (an alias for `t`), not calls to a product `tOr()` API. `tools/probe-rebase.mjs` and `tools/probe-queue.json` support drift reporting and a queued rebase workflow for a disposable upstream clone. Applying that queue changes the clone; a successful rebase or build still does not prove a live-client result.

### 5. Static guards and tests — **Implemented; scope is repository code/fixtures**

Tests cover locale resolution, placeholder substitution, RU form selection, pack validation, extraction, key sync, font declarations/coverage, and other local contracts. `tools/key-sync.mjs` reports added, changed, and removed upstream keys; removed keys are deprecation candidates, not permission to delete stable keys. `tools/loc-check.mjs`, `tools/wire-check.mjs`, and other guards inspect their documented inputs. Passing these checks does not establish host-client integration, German glyph rendering, or live display. Tests and fixtures are not a substitute for those checks.

## Data flow and non-negotiable boundary

```text
Upstream/source strings ──> extraction / key-sync / review ──> locale data
                                                               │
Bundled tables ──> t()/tp() ──> display
Optional RU JSON overlay ──> overlay/adapter API ──> display
                              (client call path unverified)
Quest/book -LOC + fonts ──> RU package builder ──> delivery path not verified

Stable IDs and keys ──> network messages, saves, and quest logic
                         (never localized display strings)
```

Localized text is presentation only. Network messages, saves, and quest logic must carry stable IDs/keys (for example, a template or quest key), never translated display text. A UI label may be rendered from a key at the display boundary; do not persist or transmit its rendered value. This repository does not prove the external client follows the intended integration contract.

## Evidence limits

- Code inspection and automated tests establish only the behavior they exercise. For example, the external-fetch test injects a stub; it does not establish that a live client fetches `Prefs/Locale`.
- Packaged `-LOC` presence does not prove that the game loads those files. The separate client loading path is not in this repository.
- “Example/proposed” call sites describe a possible integration, not an installed or upstream-merged feature. “Unverified” claims need named client/upstream evidence before being promoted.
