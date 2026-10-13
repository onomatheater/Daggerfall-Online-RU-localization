# Development and verification

This guide covers checks and builds for the stopped localization handoff
repository. It does not establish compatibility with a live Daggerfall Online
client. See [Known Gaps](KNOWN-GAPS.md) and the
[architecture guide](ARCHITECTURE.md) for the current evidence limits.

## Prerequisites and test setup

Use Node.js 20 or newer. The root `npm test` script runs the Node built-in test
runner with the root package's Windows-compatible glob. Some tests import
updater modules, so install the updater dependencies first. From the repository
root, run:

```sh
cd updater
npm ci
cd ..
npm test
```

`npm ci` installs the lockfile-pinned dependencies into `updater/node_modules`
and may download packages or run their installation scripts. `npm test` runs
`node --test "test/*.test.js"` from the repository root. Tests may create
temporary fixtures; they are not intended to publish or alter a game install.

## Read-only checks

The following checks do not write project deliverables:

```sh
npm test
git diff --check
```

Two optional static guards inspect a source checkout of the external upstream
client. Pass the path to that checkout's `src` directory explicitly; neither
guard edits it:

```sh
node tools/wire-check.mjs "<upstream-client-src-directory>"
node tools/menu-cover.mjs "<upstream-client-src-directory>"
```

`wire-check` checks localization call sites against this repository's English
and Russian tables. `menu-cover` checks the configured menu files against the
English menu-key set. Their inputs are not present in this repository, so a
useful run requires a separate upstream source checkout. Review guard output;
these static checks do not apply or rebase probes.

## Commands with write or release effects

### Updater dependency installation

`npm ci` (run from `updater/`) writes dependencies under `updater/node_modules`
and can run dependency install scripts. It is needed before the root test suite
can import updater modules, but is not a read-only check.

### Build the Windows updater installer

After installing updater dependencies, this command builds a Windows NSIS
package:

```sh
cd updater
npm run dist
```

The `dist` script invokes `electron-builder --win nsis` and writes build output
under `updater/release/`. No signing credentials or configuration were found in
the inspected tracked updater package and source. The build environment or
produced artifact may differ; no build was performed or artifact inspected.
Verify the actual artifact's signature status before distribution. The command
builds local artifacts; it does not publish them. Do not run it as part of
ordinary read-only verification.

### Probe, package, install, and publication workflows

Other tools can write to paths supplied by the operator, mutate disposable
upstream/probe trees, or affect an installed game. The updater's recipe
fallback and its **Download game** action write game-installation files. Pack
preparation writes package/feed artifacts. `tools/publish-pack.mjs --run`
mutates its probe workflow and stages artifacts; it is not publication. A
non-dry `publishPack` operation can write pack files, commit, and push to
`main`. Do not run probe-apply, package, installer, release, or publication
operations without reviewing the target and obtaining the required
authorization. Follow the [player updater guide](updater.md),
[launcher/operator guide](../LAUNCHER.md), and
[pack operations guide](../packs/README.md) for the documented effects. This
handoff authorizes no live-client or release operation.

## What automated tests establish

The test suite covers repository code and fixtures, including locale helpers,
pack validation, updater library logic, and publication helpers exercised
against local fixture repositories. A green suite is evidence only for the
paths those tests exercise. It does not prove that:

- a live upstream game client boots the adapter, reads `Prefs/Locale`, or
  consumes packaged `-LOC` files;
- a particular client supports `?lang=ru`, renders translated screens, or
  handles locale switching and in-flight operations correctly;
- a current compatible pack or updater binary is available, or that a built
  installer works on a player's machine; or
- the live feed, external download endpoints, or project remote behave as
  expected.

Record live-client, built-installer, feed, and release checks separately from
unit-test results. Do not describe automated tests as end-to-end integration
evidence.
