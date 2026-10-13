# RU pack updater — player guide

**Evidence note (2026-10-14):** The steps below describe the checked-in updater
code. Repository tests do not prove that a particular game-client build reads
`Prefs/Locale`; check compatibility with the client you use. See [Known Gaps](KNOWN-GAPS.md).

## Install or update the translation pack

This repository does not identify an end-user download channel for the
updater. Obtain a compatible build through a maintainer-approved channel; do
not mistake the source-tree launcher script for a released installer.

1. Start a compatible RU updater build and confirm that it has found the right
   game folder. If it has not, use **Choose folder** (`Указать папку` or
   `Сменить папку`) and select the installed game directory.
2. Select **Check** (`Проверить`). The updater compares the detected game
   version with the pack feed and offers the newest compatible pack, if one
   exists. Checking does not install it.
3. Select **Install** (`Установить`) to download and install the offered pack.
   The updater checks the downloaded archive's SHA-256 against the feed and
   validates the pack before copying its manifest-listed data files and
   manifest to the game's `Prefs/Locale/ru` directory.

The ordinary pack path is data-only: it does not patch the game's `resources`
directory. Whether the installed game build discovers and loads that preference
directory is an external client-integration question, not proved by this
repository. A missing compatible pack leaves the current pack in place (or the
game's English fallback); it does not require reinstalling the game.

## Checks, news, and network requests

- The updater requests game release news from the public GitHub Releases API
  whenever it starts. This request happens even if automatic pack checking is
  off.
- Pack checking is manual by default. The **Check on launch** option
  (`Проверять автоматически`) is opt-in and off by default. A manual check with
  a detected game version, or an enabled startup check with a detected version,
  fetches the pack feed and checks game-release metadata. A manual check
  refreshes the game-news list too.
- The pack ZIP is fetched only when you choose **Install**. A game-release
  banner can expose **Download game** (`Скачать игру`); choosing it fetches
  release metadata and the game installer, then runs the installer in the
  selected game folder.
  This action can install or update the game and changes game files. Close the
  game first. It is separate from installing the translation pack.
- With the default HTTP configuration, these updater paths make GET requests
  to the configured pack feed and relevant GitHub release/download endpoints;
  test configurations can point feed/archive URLs at local files instead. The
  inspected call sites do not attach a player profile or hardware inventory or
  implement an upload/telemetry request. Destination hosts still receive
  ordinary connection metadata (for example, network address); this is not a
  privacy audit or a guarantee about host-side logging.

## Roll back an ordinary pack

After at least two pack versions have been installed, **Rollback** (`Откатить`)
reinstalls the previous locally stored pack into `Prefs/Locale/ru`. The
updater keeps up to three pack archives in its local application data. This
control rolls back a pack only; it does not roll back a game update or the
recipe fallback below.

## Restore via a game-build recipe (separate fallback)

If a compatible offered pack includes a recipe, the updater can show **Restore
translation** (`Восстановить перевод`). This is not ordinary pack installation:
it can migrate `resources/app.asar` to an unpacked `resources/app` directory,
save an asar backup, download and verify the recipe, then apply it to
`resources/app/dist` and verify the result. This writes game-installation files.
The game must be closed. Use this only when the normal `Prefs/Locale` path is
not supported by the target game build. The repository does not establish that
every game version supports either integration path; recipe rollback is not
the same as the **Rollback** pack button.

## If no pack is offered

The feed may not contain a pack compatible with the detected game version, or
the request may have failed. Keep using the current pack or the game's English
fallback and check again when a compatible release is available. For updater
implementation, build, and release procedures, see the [maintainer guide](../LAUNCHER.md).
