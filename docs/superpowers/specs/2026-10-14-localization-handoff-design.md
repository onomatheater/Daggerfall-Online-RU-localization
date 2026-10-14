# Localization project handoff documentation — design

**Status:** Draft for maintainer review
**Date:** 2026-10-14
**Audience:** A prospective German-language translator/maintainer who may need to understand and operate the complete localization toolchain.

## Goal

Provide a concise, English-language handoff that explains what this repository is, how its implemented parts fit together, how to develop and validate changes, and what remains incomplete or uncertain. A new maintainer must be able to distinguish shipped behavior from examples, plans, and unverified assumptions without relying on private machine notes or the original author's memory.

The handoff documents the project as it exists; it does not claim that documentation resolves the architecture concerns raised by the upstream contributor.

## Constraints

- Do not change game balance, protocol, save format, or runtime behavior as part of the documentation work.
- Do not imply that German is supported just because the Russian implementation exists. Identify Russian-specific assumptions and any code work needed for another locale.
- Treat the repository's actual code and tests as evidence. Mark proposals and TODO entries as such.
- Do not publish personal paths, credentials, private correspondence, or local-only `todo.md` content as authoritative project documentation.
- Describe third-party text/font provenance cautiously. Do not infer that permission to use one translation automatically grants redistribution or derivative-translation rights.
- All deliverable documentation is in English, including component guides that are updated as part of this handoff.

## Documentation set

### 1. Root `README.md` — project entry point

Replace the Russian-only introduction with a concise English overview containing:

- project purpose and non-goals;
- current maintenance/compatibility status and intended audience;
- high-level component map;
- supported installation or usage paths, with prerequisites;
- links to architecture, translation, integration, development, package/updater, and gaps documentation;
- a warning that the client/upstream integration and compatibility status must be checked before use.

Keep component detail out of the root README.

### 2. `docs/ARCHITECTURE.md` — system map and data flow

Explain the boundaries and lifecycle of:

- locale dictionaries and runtime resolution;
- adapter/injection into the game client;
- external locale package loading;
- translation data such as `-LOC` files and font assets;
- package building, feed selection, launcher installation, and update recovery;
- static guards/tests versus runtime/headless evidence.

Use a small text diagram if useful. Label each path as **implemented**, **example/proposed**, or **not verified**. Explain the invariant that localized display text must not enter network messages, saves, or gameplay logic.

### 3. `docs/LOCALIZATION.md` — locale data and translation workflow

Refresh `docs/TRANSLATING.md` and add `docs/LOCALIZATION.md` for the generic technical reference. Document table/key structure, EN fallback, parameter placeholders, baked plural/select forms, month/case data, markup preservation, UTF-8 conventions, `-LOC` section boundaries, font constraints, and relevant validation commands. Explain how an existing translation is edited and how a new locale differs from editing RU values.

Keep locale-specific glossary and editorial decisions separate from generic mechanics. Do not present the Russian QA glossary as a German glossary.

### 4. `inject/README.md` — client integration contract

Rewrite in English and distinguish:

- the adapter's actual exported API and tests;
- illustrative call-site examples;
- upstream changes that would still be needed;
- the unresolved way for a browser/Electron client to access `Prefs/Locale`;
- locale switching responsibilities (client rerender and font-atlas invalidation) and the no-network/no-save-change contract.

Examples must be checked against current exports and tests before being described as drop-in instructions.

### 5. `docs/updater.md`, `LAUNCHER.md`, and `packs/README.md` — user and operator docs

Rewrite `docs/updater.md` as the player-facing guide and `LAUNCHER.md` as the developer/operator guide; keep their audiences distinct rather than duplicating instructions. Update `packs/README.md`. Cover launcher modules, package/feed/manifest shape, compatibility selection, hashes, installation and rollback, recipe fallback, build/test commands, publication flow, and which commands can write files, publish, or otherwise have side effects. State that live Electron validation and releases require explicit authorization.

### 6. `docs/DEVELOPMENT.md` — contributor/developer setup

Document supported Node version, exact root and updater test/build commands, static checks, expected test scope, and the limits of automated verification. State that updater dependencies must be installed from `updater/` before the root test suite can exercise updater modules. Separate safe read-only checks from commands that alter a probe, package, installed game, or published feed. Do not prescribe machine-specific paths.

### 7. `docs/KNOWN-GAPS.md` — explicit implementation and verification inventory

This is a required, separate handoff document. Organize entries into:

1. planned but not implemented;
2. partially implemented / delivery gaps;
3. known integration or test coverage gaps;
4. claims that require maintainer or upstream confirmation.

Each entry should include **status**, **evidence** (file/symbol/test paths), **impact**, and **next decision or verification needed**. Include still-open items from the current maintainer-approved work queue only after checking them against code; label them as a dated roadmap snapshot, not a promise to continue. Do not copy local TODO history or machine-specific details. Give each claim an “as of” date and distinguish source-code inspection from a test or live-client verification.

### 8. `CONTRIBUTING.md` — contribution entry point

Make it English and locale-neutral at the project-policy level. Link to the generic localization workflow and explain review, tests, and scope boundaries. Move RU-only permissions/key-ownership rules to an RU-specific appendix or clearly label them as non-portable policy; do not silently apply them to a German fork.

## Findings from the preliminary audit (2026-10-14)

These are source/document comparisons, not proof from a live game session. The final gaps document must cite the current evidence and preserve this distinction.

1. **A German locale is not currently a drop-in data-only addition.** `src/locale/locale.js` statically registers only `en` and `ru`; `src/locale/loader.js` requires `manifest.locale === 'ru'` and reads `ru.json`; `inject/locale-adapter.js` registers the package under `PACK_LOCALE = 'ru'`; `tools/pack-ru.mjs` emits RU filenames and only packages RU data. `docs/TRANSLATING.md` currently says the machinery can be reused for any language by copying the EN table and wiring a locale, which understates the code changes needed for the external-pack/updater path.
2. **The translation guide describes APIs and workflow that no longer match the repo.** It names `tOr()` as part of `src/locale/locale.js`, while the product module does not export it (`tOr` is probe-only per `AGENTS.md`). It also describes `extract-texts.mjs` as rewriting to `t()` and the overlay as a one-shot patch with no upstream tracking; current extractor output aliases `t` as `ruT`, and the repository has key-sync and probe-rebase tooling.
3. **Packaged `-LOC` delivery is not the same as runtime consumption.** `tools/pack-ru.mjs` copies quest and book `-LOC` files but not BIOG. `tools/load-pack.mjs` and `src/locale/loader.js` load only the manifest and `ru.json` into the JSON overlay. The external client's separate `-LOC` loading path is not present in this repository and needs confirmation.
4. **Client integration remains unproven here.** `loadExternalPackFetch()` and adapter methods have unit tests, but this repository has no client boot call that invokes them. `inject/README.md` itself leaves `Prefs/Locale` access unresolved. The README's `?lang=ru` instruction has no implementation reference in this repository and must be attributed to, and checked against, the external client.
5. **Language switching is only part of the contract in this repo.** `setLocale()` changes the bundled locale; the host client must rerender open UI and invalidate font atlases. The AGENTS contract for in-flight trade/cast/quest operations says a future test should hold the guarantee; do not claim that case is currently verified.
6. **The morphology docs overstate ICU support.** `src/locale/morph.js` selects baked `one/few/many` forms using the RU rule and `select()` chooses a supplied key. It is not a general ICU message parser; the generic guide must describe the actual helper/data format.
7. **Updater documents conflict with current code and each other.** `docs/updater.md` says the feed URL is an `example.invalid` placeholder and describes requests as user-triggered, while `updater/lib/config.js` sets a real feed URL and `updater/main.js` fetches game news on every launch. The main process also has an explicit `download-game` action, while `LAUNCHER.md` says the updater does not download the game. Normal locale installation targets `Prefs/Locale`, but the recipe fallback migrates the installation and applies a recipe to `resources/app/dist`; document these as separate paths.
8. **Release side effects need a precise operator guide.** `tools/publish-pack.mjs --run` mutates the probe workflow and stages the pack/recipe artifacts plus a release-entry object; it does not itself publish or write `feed.json`. `tools/publish-gates.mjs` is the path that can commit and push `packs/**` on `main`. The checked-in `packs/README.md` should be reconciled with actual CLI requirements and these side effects.
9. **German glyph support needs a real proof.** Handjet's Latin face range includes U+00E4/U+00F6/U+00FC/U+00DF, but the font/SDF tests pin RU-specific glyphs and do not explicitly assert German text rendering in the game client. Record this as unverified until cmap and rendered output are checked.
10. **Dependency health needs review.** A fresh `npm ci` in `updater/` reported 11 dependency advisories (8 moderate, 3 high). Inspect current `npm audit` details and disposition before describing dependency health as known; do not run automatic dependency fixes as part of a docs task.
11. **Translation-text rights are not documented consistently.** The tracked README says Jagget content is used with permission; the local policy notes no response and a private-use decision. Do not export the permission claim or infer German derivative/redistribution rights without documentary confirmation. The Guildenstern font has a tracked CC BY-SA attribution/exception that should remain explicit.
12. **Other user instructions need reconciliation.** The README says `node --test test/`, but `package.json` pins the Windows-safe `node --test "test/*.test.js"` command. Updater tests additionally require `npm ci` in `updater/`. Record exact tested commands and environments in the contributor docs.

## Documentation audiences and exclusions

- `docs/updater.md` is player-facing; `LAUNCHER.md` and `packs/README.md` are operator/developer references.
- `AGENTS.md`, local `todo.md`, SDD ledgers, the Russian QA skill, and its Russian glossary are internal or language-specific sources, not generic German handoff docs. Do not translate private machine instructions wholesale or treat local TODO state as a public commitment.
- Also review `updater/assets/README.md` and `vendor/guildenstern-nbp/ATTRIBUTION.md` for English-language provenance notes; retain upstream/vendor notices as required rather than rewriting license texts.

## Recommended implementation order

1. Audit every handoff-facing document against code/tests; build the `KNOWN-GAPS.md` evidence table first and reconcile contradictory claims.
2. Write `ARCHITECTURE.md` from that audited inventory.
3. Update the root README and contribution/translation workflow.
4. Translate and reconcile injection, launcher, and package guides against code.
5. Run documentation link/command checks and relevant existing tests; do not claim runtime proof without running it.
6. Review licensing/provenance wording and remove private/local-only information before the handoff is shared.

## Out of scope

- Implementing German locale support or changing locale APIs.
- Fixing runtime, pack delivery, updater, or upstream integration gaps.
- Translating the game's content into German.
- Publishing a release, contacting upstream on anyone's behalf, merging branches, or changing licenses/permissions.
- Copying local-only `todo.md`, ledgers, machine paths, or private attribution notes into public documentation.

## Acceptance criteria

- A German maintainer can navigate from the root README to every relevant guide.
- Docs consistently distinguish implemented behavior, proposals, and unverified claims.
- `KNOWN-GAPS.md` is a standalone document with evidence and next actions for planned, partial, and missing work.
- Every documented command and API is checked against the repository; risky side effects are identified.
- Locale-neutral guidance does not encode RU-only assumptions as universal behavior.
- No local paths, secrets, private communication, or unverified licensing claims are exposed.
- Documentation changes are reviewed as a single handoff series and are not merged into `dev` or `main` without the required approval gates.
