# RU pack feed and release operations

This is an operator guide, not player installation instructions. For the
player-facing flow, see [the updater guide](../docs/updater.md); for updater
internals and test limits, see [the maintainer guide](../LAUNCHER.md) and
[Known Gaps](../docs/KNOWN-GAPS.md). Source and test behavior were inspected on
2026-10-14; a green fixture test is not a live release check.

## Package and feed formats

`tools/pack-ru.mjs` writes a pack directory containing `ru.json`, the selected
Handjet font files, quest and book `-LOC` files, and `locale-version.json`. The
manifest identifies `locale: "ru"`, a pack `version`, the relative `files`
list, and a game compatibility stamp: exact `game`, or `gameMin` with optional
`gameMax`. This packer does not include BIOG files. Preserve the directory's
relative paths when making the ZIP.

`tools/verify-pack.mjs <pack-dir>` checks the manifest/file list, translation
JSON, version range, quest/book content, and WOFF2 signatures. A successful
check is package validation, not proof that a game client loads the package or
its `-LOC` files.

`packs/feed.json` is `{ "generated": "…", "packs": [...] }`. Each pack entry
contains the manifest fields plus `url` and `sha` (SHA-256 of the ZIP); optional
fields are `notes` and `recipe: { "url": "…", "sha": "…" }`. The client
selection logic picks the newest compatible version. An entry without a valid
game stamp is not compatible. `tools/release-ru.mjs --in <items.json> --out
<feed.json>` builds the feed from items with `zipPath`, `packDir`, and `url`,
plus optional `notes` and `recipe`. It verifies the pack and computes the pack
ZIP hash; recipe hash is supplied in the input. The checked-in feed currently
has no pack entries, so inspect it before announcing a release.

## Manual pack preparation

From the repository root, prepare and validate a package with a compatibility
stamp appropriate to the target game:

```sh
node tools/pack-ru.mjs --out <pack-dir> --version <pack-version> --game <game-version>
node tools/verify-pack.mjs <pack-dir>
```

Use `--game-min <version>` and optional `--game-max <version>` instead of
`--game` for a compatibility range. Create the archive and recipe artifacts,
then prepare `items.json` and generate `packs/feed.json` with the release tool.
The manual preparation commands write the output directory, ZIP, and feed path
you provide. Review the generated feed and artifacts before any publication.

## Staging pipeline is not publication

First inspect the command's usage (safe; no pipeline execution):

```sh
node tools/publish-pack.mjs --help
```

Required arguments are `--tag <app-vX>`, `--from <app-vY>`,
`--version <game-version>`, `--pack-version <version>`, `--scripts <dir>`,
`--queue <json>`, `--markers <comma-separated-values>`, `--notes <text>`,
`--url-base <url>`, `--work-root <dir>`, `--vanilla-clone <dir>`, and
`--probe-tree <dir>`. The default invocation is a plan-only dry-run.

**`--run` has write side effects and is not publication.** It removes only the
pipeline's owned assets from the probe tree, copies locale/font assets, applies
the selected probe queue, installs dependencies in the clone trees, builds
vanilla and patched outputs, checks markers, and stages pack and recipe ZIPs
under the work root. It returns a release-entry object (not written to a file).
It mutates the probe workflow. It does not publish the staged files or write
`packs/feed.json`.
Do not run it without explicit authorization and a reviewed target workspace.

## Publication helper and side effects

`tools/publish-gates.mjs` has no CLI interface; `node tools/publish-gates.mjs
--help` does not print command help. It exports two independent helpers:

- `gatesOk(report)` returns true only when the supplied `build`, `markers`,
  `pack`, and `probe` fields are all `true`.
- `publishPack({ repoDir, files, message, dryRun })` defaults to `dryRun: true`
  and returns a plan without writing. A non-dry call accepts only files under
  `packs/**`; it refuses a dirty tree outside `packs/` or a branch other than
  `main`, writes the supplied files, runs `git add packs`, commits, and pushes
  `origin main`.

`publishPack` does not call `gatesOk` itself. Verify gates and inspect exact
files before requesting publication; a non-dry call can commit and push to
`main` and requires explicit maintainer authorization. Tests exercise the
publisher using temporary local Git repositories, not the project remote.
Staging and publication are separate steps; never infer that staged artifacts
have been released.
