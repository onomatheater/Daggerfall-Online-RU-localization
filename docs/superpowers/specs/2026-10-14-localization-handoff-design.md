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

Document table/key structure, EN fallback, parameter placeholders, baked plural/select forms, month/case data, markup preservation, UTF-8 conventions, `-LOC` section boundaries, font constraints, and relevant validation commands. Explain how an existing translation is edited and how a new locale differs from editing RU values.

Keep locale-specific glossary and editorial decisions separate from generic mechanics. Do not present the Russian QA glossary as a German glossary.

### 4. `inject/README.md` — client integration contract

Rewrite in English and distinguish:

- the adapter's actual exported API and tests;
- illustrative call-site examples;
- upstream changes that would still be needed;
- the unresolved way for a browser/Electron client to access `Prefs/Locale`;
- locale switching responsibilities (client rerender and font-atlas invalidation) and the no-network/no-save-change contract.

Examples must be checked against current exports and tests before being described as drop-in instructions.

### 5. `LAUNCHER.md` and `packs/README.md` — operations

Rewrite/update the existing guides in English rather than creating duplicate launcher guides. Cover launcher modules, package/feed/manifest shape, compatibility selection, hashes, installation and rollback, recipe fallback, build/test commands, publication flow, and which commands can write files, publish, or otherwise have side effects. State that live Electron validation and releases require explicit authorization.

### 6. `docs/DEVELOPMENT.md` — contributor/developer setup

Document supported Node version, exact root and updater test/build commands, static checks, expected test scope, and the limits of automated verification. State that updater dependencies must be installed from `updater/` before the root test suite can exercise updater modules. Separate safe read-only checks from commands that alter a probe, package, installed game, or published feed. Do not prescribe machine-specific paths.

### 7. `docs/KNOWN-GAPS.md` — explicit implementation and verification inventory

This is a required, separate handoff document. Organize entries into:

1. planned but not implemented;
2. partially implemented / delivery gaps;
3. known integration or test coverage gaps;
4. claims that require maintainer or upstream confirmation.

Each entry should include **status**, **evidence** (file/symbol/test paths), **impact**, and **next decision or verification needed**. Avoid turning historical TODO entries into commitments. Give each claim an “as of” date and distinguish source-code inspection from a test or live-client verification.

Initial candidates to verify while writing the final docs (not assertions of completion):

- German/general multi-locale support may be incomplete: runtime tables, manifest validation, pack naming/output, and installation paths appear RU-specific (`src/locale/locale.js`, `src/locale/loader.js`, `tools/pack-ru.mjs`, updater paths).
- The pack builder includes quest/book `-LOC` data, but the JSON overlay reader consumes only the manifest and `ru.json`; verify how, or whether, those `-LOC` files are consumed at runtime. The builder's listed directories should also be checked for BIOG coverage.
- `setLocale()` changes locale state, but rerendering open client surfaces and SDF invalidation depend on client integration; the in-flight-operation contract may not have a current test.
- Access from browser/Electron to `Prefs/Locale` is called out as unresolved in the injection guide.
- The upstream integration choice (in-client PR versus external overlay) and current upstream compatibility need confirmation.
- The launcher entry point may not be directly covered by tests, and release automation is not CI-based; verify current docs/code before recording.
- A fresh `npm ci` in `updater/` reported 11 dependency advisories (8 moderate, 3 high); review current `npm audit` details and disposition before presenting dependency health as known.
- Generic ICU claims should be compared with the actual morphology implementation and described precisely.
- Redistribution/provenance status for translation text and font exceptions must be recorded only with verified evidence and permission.

### 8. `CONTRIBUTING.md` — contribution entry point

Make it English and locale-neutral at the project-policy level. Link to the generic localization workflow and explain review, tests, and scope boundaries. Move RU-only permissions/key-ownership rules to an RU-specific appendix or clearly label them as non-portable policy; do not silently apply them to a German fork.

## Recommended implementation order

1. Audit code, tests, and existing docs; build the `KNOWN-GAPS.md` evidence table first.
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
