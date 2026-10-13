# Translation workflow

This repository contains a Russian localization overlay for [Daggerfall Online](https://github.com/Lattymoy/daggerfall-js-source). Its existing code and tooling are useful references, but a new locale is **not** wired by adding a JSON file alone. Read [Locale data and mechanics](LOCALIZATION.md) for runtime details, [Architecture](ARCHITECTURE.md) for evidence boundaries, and [Known Gaps](KNOWN-GAPS.md) before treating an example as client support.

## Editing existing RU values

1. Find the stable key in `src/locale/en.json` and edit only its corresponding value in `src/locale/ru.json`. Do not rename or delete keys. If a source key disappears, treat it as a deprecation candidate; preserve it unless maintainers make a separate decision.
2. Keep placeholders, formatting markers, and data shape intact. Localized display text is presentation only: network messages, saves, and quest logic must continue to carry IDs/keys, never rendered translations.
3. Save localization JSON/text/CSV as UTF-8 without BOM. For quest `-LOC` files, translate `QRC:` prose only; do not modify `QBN:` logic. Preserve macros and structural markup.
4. Run the applicable checked-in tests/validators. `npm test` runs the root suite using the command in `package.json`; tests establish repository contracts only, not live-client rendering. `tools/ru-scan.mjs` contains RU-specific checks and is not a generic validator for other languages.

## Keeping keys aligned with upstream

`tools/key-sync.mjs` compares upstream English tables with this repository’s `en.json`. For example:

```sh
node tools/key-sync.mjs --upstream <path-to-upstream-en.json> --en src/locale/en.json
```

Review its queues rather than treating them as automatic translation: `newKeys` need human-authored values; `changedEn` requires review of translations that may have become stale; `gone` identifies keys to deprecate, not delete. The command exits nonzero when new or changed keys exist, so that result means work is queued, not that it translated anything.

`tools/extract-texts.mjs` exports helpers that find likely UI literals and can rewrite eligible display literals to `ruT('dfo:page.slug')`, adding an import alias `t as ruT`. It skips likely IDs/code and surfaces some risky strings for human review. This is a tooling helper, not a complete parser or a guarantee every visible string is found. Check its tests and inspect generated output before using it.

## Production APIs versus probe helpers

- The product `src/locale/locale.js` exports `t`, `tp`, `hasKey`, `setLocale`, `getLocale`, and `splitKey`. It does **not** export `tOr` or `ruT`.
- `ruT` in extractor-generated source is simply a local alias for `t`.
- `tOr`/`ruTOr` names belong to probe/call-site fallback scaffolding, not to the product locale module. Do not copy a probe-only helper into a production API claim.
- `inject/locale-adapter.js` has its own tested wrapper API, but this repository does not contain a game boot path proving that the client invokes it.

## Rebasing upstream probes

The current workflow tracks probe scripts and touched upstream files in `tools/probe-queue.json`; `tools/probe-rebase.mjs` can first report drift without mutation. Its CLI takes a scripts directory, disposable upstream clone, queue, and from/to refs; the default is dry-run. Review the drift report before considering `--apply`: that mode runs the patch queue against the clone and can change it. It refuses a dirty clone unless explicitly allowed; when it snapshots an allowed dirty tree, it restores that work after the queue. Probe success is not a live-client verification.

## Adding another language

Do not advertise German or another locale as supported by copying `en.json` and translating it. The current runtime and external package path are RU-specific: locale registration, manifest validation, adapter registration, package filenames/building, plural/month behavior, validation, fonts, and host-client integration need code and pipeline work. The external loader currently expects an RU pack; client boot and `-LOC` consumption are not established here. See [Known Gaps](KNOWN-GAPS.md) for evidence and verification needs. This guide does not choose another language’s plural rules, glossary, or editorial policy.
