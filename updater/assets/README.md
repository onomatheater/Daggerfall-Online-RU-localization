# Updater window and installer icons

- `icon-src.png` is the Daggerfall Online icon from the
  `daggerfall-js-source` repository, licensed MIT, © Lattymoy; source file:
  `public/icons/icon-512.png` at the probe's pinned upstream revision. The
  required notice is retained in [`../launcher/NOTICE.md`](../launcher/NOTICE.md).
  It was selected for the updater window only, not for the game.
- `icon.ico` is generated from `icon-src.png` by `npm run icons` using
  `png-to-ico` and contains multiple sizes. The generated file is checked in so
  the updater build can use it without regenerating it.
