# Daggerfall Online RU localization — project handoff

**Status (2026-10-14): stopped and handed off.** This repository is not
actively maintained, and this handoff does not promise future updates. Its
current compatibility with any particular Daggerfall Online client is
unverified.

This repository is a Russian-language data overlay and supporting tools for
[Daggerfall Online](https://github.com/Lattymoy/daggerfall-js-source), the
separate game project. It contains locale tables, quest/book text assets,
fonts, adapter examples, pack tooling, and an updater. It is not a copy of the
game client or server. It does not aim to change game balance, network
protocols, or save formats. The RU-specific implementation does not mean that
German or another locale is supported by adding translated data alone.

## Compatibility and availability

No currently compatible updater binary or direct download asset URL has been
verified, and the checked-in pack feed is empty. Do not assume a pack or
installer is available from the generic Releases page; confirm current
availability and client compatibility with a maintainer before use.

This repository does not implement or verify the game's `?lang=ru` URL
behavior. That behavior belongs to the external game client and needs
confirmation for the exact client version. Likewise, the repository's unit
tests do not establish that a client loads installed locale data or displays
the translated assets.

## Repository map

- `src/locale/` — bundled English and Russian dictionaries and locale helpers.
- `src/locale/ru/` and `vendor/` — Russian text assets and font files.
- `inject/` — adapter module and illustrative client-integration guidance;
  client boot wiring is not established here.
- `tools/`, `packs/`, and `updater/` — package, validation, feed, and updater
  source. See the operator guides before running commands with write or release
  effects.
- `test/` — automated tests for repository modules and fixtures, not a live
  client verification suite.

Development requires Node.js 20 or newer. The updater dependencies must be
installed from `updater/` before the root test suite can exercise updater
modules. See [Development](docs/DEVELOPMENT.md) for exact commands and their
effects.

## Handoff guides

- [Known gaps and verification status](docs/KNOWN-GAPS.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Locale data and mechanics](docs/LOCALIZATION.md)
- [Translation workflow](docs/TRANSLATING.md)
- [Contribution guidance](CONTRIBUTING.md)
- [Client integration contract](inject/README.md)
- [Player updater guide](docs/updater.md)
- [Updater maintainer and launcher guide](LAUNCHER.md)
- [Pack and feed operator guide](packs/README.md)
- [Development setup and checks](docs/DEVELOPMENT.md)
- [Updater asset attribution](updater/assets/README.md)
- [Guildenstern NBP font attribution](vendor/guildenstern-nbp/ATTRIBUTION.md)

The provenance and reuse scope of existing translation text is not established
by this handoff; see [Known Gaps](docs/KNOWN-GAPS.md#translation-text-provenance-and-reuse-scope-are-not-established-here).
