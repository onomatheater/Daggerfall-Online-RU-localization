# Updater and launcher — maintainer guide

This is the developer/operator reference for the Electron RU-pack updater and
the pack release tooling. For player steps, see [the updater guide](docs/updater.md).
Evidence labels follow [Known Gaps](docs/KNOWN-GAPS.md): **Code inspection**
and **Automated test** describe repository evidence, not a live game-client
check. The client boot path that consumes `Prefs/Locale` remains unverified.

## Components and boundaries

- `updater/main.js` is the Electron shell: window/IPC wiring, startup news,
  network calls, filesystem paths, and dispatch to library actions. Keep
  decision logic in the Node-testable `updater/lib/` modules.
- `updater/lib/config.js` owns URLs, file names, and path constants;
  `flow.js` selects compatible packs, validates update state, and maps errors;
  `actions.js` orchestrates check/install operations; `view.js` derives the
  view state consumed by the launcher page.
- `game-install.js` selects, downloads, verifies, and runs a game installer
  after the visible `download-game` action. This action can install/update the
  game; it is not limited to checking for a release.
- `migrate.js` and `dist-apply.js` implement the distinct recipe fallback:
  migrate an asar installation to an unpacked application tree, then apply and
  verify a recipe under `resources/app/dist`.
- `paths.js`, `prefs.js`, `asar.js`, `unzip.js`, and `launch.js` contain
  filesystem/path handling, updater preferences, version detection, archive
  extraction, and game launch helpers. `updater/launcher/` renders the view;
  `preload.js` bridges it to the main process. `updater/vendor-dfo/` contains
  the upstream update-check helper and its notice is in that directory.
- Root `tools/` modules build and verify packs, generate feed entries, install
  pack data, store local rollback archives, and build game-version recipes.
  `packs/README.md` documents pack and publication procedures.

## Install dependencies, test, and build

Use Node.js 20 or newer. Updater dependencies must be installed from `updater/`
before the root suite can import and exercise updater modules:

```sh
cd updater
npm ci
cd ..
npm test
```

`npm test` runs `node --test "test/*.test.js"` from the repository root. The
tests cover pure updater modules, view-state logic, filesystem fixtures, pack
validation, game-installer stages with injected dependencies, and publishing
helpers against local fixtures. They do not launch Electron, contact the live
feed, install a game, or publish to the project remote. `updater/main.js` is
the Electron boundary and does not have an equivalent end-to-end test here.

To build the Windows NSIS package (writes build output under `updater/release/`):

```sh
cd updater
npm run dist
```

The current NSIS target is unsigned. `npm run icons` writes `assets/icon.ico`
from the checked-in source image and is needed only when that source changes.
`updater.bat` starts the local Electron app and therefore launches Electron;
live Electron validation requires explicit authorization. Do not treat a
successful build or unit suite as proof of a packaged release or client
integration.

## Storage and write paths

The ordinary pack path downloads and verifies a ZIP, validates the pack, and
copies the manifest-listed data files plus `locale-version.json` to the game's
`Prefs/Locale/ru` directory. Downloaded pack archives and their index are kept
under the updater's application-data `packs/` directory (up to three versions
for the rollback action). This path does not write the game's `resources`
tree. Whether the game client reads that preference directory is unverified in
this repository.

The **Restore translation** recipe fallback is separate and writes to the
game installation. It may extract `resources/app.asar` into `resources/app`,
keep an asar backup under updater application data, and apply the recipe to
`resources/app/dist`; original dist files affected by the recipe are backed up
under updater application data. The fallback verifies its result. Do not
describe it as an ordinary data-only pack install or claim that the updater
never changes game files. A successful migration removes `app.asar` after
checking the extracted `package.json`.

The visible game download action fetches release metadata and installer bytes,
checks size and SHA-512 metadata, and runs the game's installer silently in the
selected game directory. Close the game first. With the default HTTP
configuration, the code uses outbound GET requests for game news at every
startup, game-release checks, pack-feed checks, pack ZIPs, and (if requested)
installer metadata/downloads. `RU_FEED_URL` and file URLs can select local
feed/archive paths for a test setup instead. These code paths do not add
player-profile or hardware-inventory fields or implement an upload/telemetry
request; ordinary network metadata is still visible to destination hosts, and
repository inspection is not a privacy audit.

## Pack feed and release

The feed is `packs/feed.json`; its top-level shape is `{ "generated": "…",
"packs": [...] }`. Each generated pack entry carries manifest fields
(`locale`, `version`, `files`, and a game compatibility stamp), `url`, and
`sha` (SHA-256 of the ZIP). Optional `notes` and `recipe: {url, sha}` are also
supported. A manifest uses either exact `game` or a `gameMin`/optional
`gameMax` range. Selection uses the newest compatible pack; an unmarked pack is
not compatible. The checked-in feed is currently empty; check the feed before
claiming a player can install a release.

Pack creation and validation:

```sh
node tools/pack-ru.mjs --out <pack-dir> --version <pack-version> --game <game-version>
node tools/verify-pack.mjs <pack-dir>
```

`pack-ru.mjs` can instead take `--game-min <version>` and optional
`--game-max <version>` for a range. Archive the directory contents while
preserving relative paths. `release-ru.mjs` accepts `--in <items.json>
--out <feed.json>`; each item supplies `zipPath`, `packDir`, `url`, and
optional `notes` and `recipe: {url, sha}`. It validates the pack and computes
the pack ZIP's SHA-256. These commands write their specified output paths.

For the probe staging pipeline, inspect the safe usage first:

```sh
node tools/publish-pack.mjs --help
```

The documented usage requires `--tag <app-vX>`, `--from <app-vY>`,
`--version <game-version>`, `--pack-version <version>`, `--scripts <dir>`,
`--queue <json>`, `--markers <comma-separated-values>`, `--notes <text>`,
`--url-base <url>`, `--work-root <dir>`, `--vanilla-clone <dir>`, and
`--probe-tree <dir>`. Without `--run`, it reports the planned steps only.
**Do not treat `--run` as a dry-run:** it scrubs pipeline-owned probe assets,
copies tables/fonts, applies the probe queue, installs dependencies in the
vanilla/probe clones, builds, checks markers, and writes staged pack/recipe
archives under the work root. It returns a release-entry object, but does not
write that object to a file, publish the artifacts, or write `packs/feed.json`.
It mutates the probe workflow.

`tools/publish-gates.mjs` is a library module, not a command-line publisher
(`node tools/publish-gates.mjs --help` has no CLI help output). Its
`gatesOk(report)` helper checks the supplied build/marker/pack/probe booleans;
`publishPack({repoDir, files, message})` defaults to a dry-run. In a non-dry
call, it accepts only `packs/**`, refuses a dirty tree outside `packs/` or a
branch other than `main`, writes the provided files, commits `packs`, and
pushes `origin main`. `publishPack` does not itself call `gatesOk`; the
operator is responsible for verifying release gates and reviewing the exact
files. Non-dry publication and releases require explicit maintainer
authorization. The publisher tests use temporary local repositories, not the
project remote.

## Change and verification expectations

Keep Electron-specific work thin and test decisions in the library modules.
Add or update tests alongside behavior changes, then run the root suite after
installing updater dependencies. For end-to-end behavior, separately record
whether it was checked in a fixture, built app, or approved live client; do not
promote module-test evidence into a claim about a running game.
