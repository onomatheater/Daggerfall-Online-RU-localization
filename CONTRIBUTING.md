# Contributing

This repository is an RU localization overlay for Daggerfall Online. This guide
describes the current repository's contribution rules; it does not establish
that another locale is supported or that this project's RU-specific policies
apply to a separate fork. For the implemented locale data and mechanics, see
[Locale data and mechanics](docs/LOCALIZATION.md). For implementation boundaries
and evidence, see [Architecture](docs/ARCHITECTURE.md) and
[Known gaps](docs/KNOWN-GAPS.md).

## Project-wide boundaries

These constraints apply to work on this localization project, independent of
the language being discussed:

- Keep localized display text at the rendering boundary. Network messages,
  saves, and gameplay or quest logic must use stable IDs/keys, not rendered
  translations.
- Preserve source keys and structural tokens. Do not translate markup,
  placeholders, macros, IDs, or logic sections as if they were prose. See the
  [localization guide](docs/LOCALIZATION.md) for the formats actually used.
- Do not infer support for a new locale from the RU implementation. German
  support would require agreed scope plus runtime, packaging, validation, font,
  and client-integration work; [Known gaps](docs/KNOWN-GAPS.md) records the
  current evidence and limits.
- Keep changes focused and add or update relevant tests with code/data changes.
  The root test command is `npm test` (`node --test "test/*.test.js"`, Node.js
  20 or newer). Passing unit tests prove only their exercised repository
  behavior, not live game-client integration.

## Current RU repository policy — RU-specific, not portable

The following rules preserve the current maintainer policy for contributions to
this RU repository. They are not a template for a German translation, a fork,
or another locale. Follow them only when the maintainer has assigned you RU
translation work in this repository.

### RU translation scope and ownership

An approved RU translator's data scope is limited to:

- Existing values in `src/locale/ru.json` (the `Value` fields only).
- Text in `QRC:` sections of `src/locale/ru/quests/*-LOC.txt`,
  `src/locale/ru/books/*-LOC.txt`, and `src/locale/ru/biog/*-LOC.txt`.

Do not add, rename, or remove keys. The `Key` values are stable; only the
maintainer owns additions, paired updates to `en.json` and `ru.json`, and their
tests. Do not edit `src/locale/en.json` or existing RU content unless the
maintainer has explicitly assigned that RU scope. Never edit `QBN:` sections;
they contain quest logic. Keep macros, placeholders, and markup unchanged.

The RU QA glossary and its exact-value assertions are language-specific. For
approved RU work, consult [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md) and the
tracked [RU localization QA guide](skills/ru-localization-qa/SKILL.md) and
[glossary](skills/ru-localization-qa/glossary.md). These sources do not define
German terminology, grammar, or review policy.

For this repository's RU translation changes, update the corresponding exact
assertion in `test/dfo-*.test.js` in the same change. Do not delete or weaken
cases (including skipping them, changing the tested key, or removing
placeholder/`Ё` checks). Keep localization data UTF-8 without a BOM. The
project's RU-specific editorial policy requires `Ё/ё`; this is not a universal
German-language rule. Before submitting approved RU work, run `npm test` and,
where relevant, `node tools/ru-scan.mjs`.

### RU repository branches and review

These are current repository governance rules, not general Git advice:

- Work from a fresh `dev` branch in a short `feat/ru-...` or `fix/ru-...`
  branch; open a PR to `dev` only. `main` receives approved merges from `dev`.
- Keep one open PR per contributor. Do not force-push or self-merge. Approval
  and merge are maintainer-controlled; do not merge without the maintainer's
  approval.
- Include `## Patch notes: <what and why>` in the PR description. For RU value
  changes, list each key and its old/new text with the reason.
- After an approved merge, remove the merged feature branch as directed by the
  maintainer. Do not delete another contributor's branch.

Do not read private/local planning notes as public contribution commitments.
Use the tracked documentation linked above for current behavior and gaps.

## Proposing German or another locale

This repository currently implements RU-specific locale and pack behavior; a
German translation is not presently a data-only addition. A German contributor
must first agree with the maintainer on the target repository/branch, file
scope, review process, and ownership policy for a separate locale or fork.
Until that arrangement is agreed, this guide grants no permission to create or
edit locale files here. In particular, it does not authorize edits to
`src/locale/en.json`, existing RU values, or RU `-LOC` data. The RU ownership,
branch, glossary, and exact-RU-test policies above do not automatically apply to
a German fork; the agreed German scope must define its own files, tests, and
review process. Do not assume RU translation text may be reused or adapted;
see the provenance question in [Known gaps](docs/KNOWN-GAPS.md).

## Integration and test evidence

The [client integration guide](inject/README.md) lists the adapter APIs and
their tests, while distinguishing them from missing game boot wiring. A green
test suite is not proof that the game loads a locale package or renders it.
Check [Known gaps](docs/KNOWN-GAPS.md) before making client compatibility or
locale-support claims.
