# Known Gaps

**Status date: 2026-10-14.** This register separates repository evidence from
behavior that requires a live client or maintainer confirmation. A passing
unit test proves only the behavior it exercises; it does not prove integration
with the external game client.

Evidence classes used below: **Code inspection** means tracked source or
documentation; **Automated test** means a checked-in test; **Roadmap snapshot**
means a dated owner queue, not a commitment; **Unverified external behavior**
means the repository cannot establish the claim without a live-client or
upstream check.

## Planned, not implemented

### A new locale is not a data-only addition

- **Status:** German (or another new locale) is not wired as a supported
  locale; adding translated JSON alone is insufficient. The runtime locale
  table contains only `en` and `ru`; the external loader validates `locale:
  ru` and reads `ru.json`; the adapter registers packs as `ru`; and the pack
  builder emits RU-specific files. The plural helper implements Russian
  `one/few/many` selection, not a general ICU message parser.
- **Evidence:** [locale.js, `tables` and `setLocale()`](../src/locale/locale.js#L9-L20);
  [loader.js, `parseManifest()` and `loadExternalPackFetch()`](../src/locale/loader.js#L17-L33);
  [locale-adapter.js, `PACK_LOCALE` and `registerPack()`](../inject/locale-adapter.js#L26-L53);
  [pack-ru.mjs, `pack()`](../tools/pack-ru.mjs#L12-L39);
  [morph.js, `plural()`](../src/locale/morph.js#L8-L25);
  [core-nucleus.test.js, unknown-locale fallback](../test/core-nucleus.test.js#L81-L94).
- **Evidence class:** Code inspection; automated test verifies an unsupported
  locale falls back to English, not support for another locale.
- **Impact:** A German translation would need runtime, package, validation,
  font, and host-integration work; copying `en.json` and adding `de.json` will
  not make a working German overlay.
- **Next decision/check:** Decide whether to generalize locale identifiers and
  package formats or maintain explicit per-locale support. Specify locale
  rules and add tests before advertising German support.
- **As of:** 2026-10-14.

### The 11 October internal owner queue is a dated snapshot, not current scope

- **Status:** An internal owner queue dated 11 October is a historical snapshot,
  not a promise or a reliable list of still-open work. Current tracked evidence
  shows the named morphology batch test, BIOG `-LOC` data and validation
  coverage, and credits-prose tests; that does not establish the maintainer's
  current priorities or release status.
- **Evidence:** [dfo-morph-batch.test.js](../test/dfo-morph-batch.test.js#L9-L58);
  [BIOG translation data](../src/locale/ru/biog/BIOG00T0-LOC.txt);
  [loc-check.test.js, BIOG checks](../test/loc-check.test.js#L65-L107);
  [dfo-credits-prose.test.js](../test/dfo-credits-prose.test.js#L24-L55).
- **Evidence class:** Dated internal roadmap snapshot plus code inspection and
  automated tests. Tests show tracked artifacts, not owner approval or live
  rendering.
- **Impact:** Treating the old queue as a commitment could mislead a new
  maintainer about ownership, priority, or what is unfinished.
- **Next decision/check:** Ask the maintainer for a newly dated, approved
  roadmap before planning work; do not infer outstanding tasks from that
  snapshot alone.
- **As of:** 2026-10-14.

## Partial/delivery gaps

### Packaged `-LOC` files are not consumed by this repository's JSON loader

- **Status:** Partial. The RU pack builder copies quest and book `-LOC` files,
  but omits the `biog/` directory. The local and browser-facing loaders read
  the manifest and `ru.json` into a JSON overlay; neither consumes the shipped
  `-LOC` files. The separate game-client `-LOC` loading path is outside this
  repository and remains unverified.
- **Evidence:** [pack-ru.mjs, `pack()`](../tools/pack-ru.mjs#L26-L38);
  [load-pack.mjs, `readPackDir()` and `loadExternalPack()`](../tools/load-pack.mjs#L9-L53);
  [loader.js, `loadExternalPackFetch()`](../src/locale/loader.js#L147-L181);
  [ru-pack.test.js](../test/ru-pack.test.js#L8-L18);
  [verify-pack.mjs, `verifyPack()`](../tools/verify-pack.mjs#L49-L63).
- **Evidence class:** Code inspection and automated pack test. No live-client
  check establishes that the game reads these files.
- **Impact:** A successful ZIP build proves files are present, not that quest,
  book, or character-creation text is displayed by the client. BIOG files are
  not included in this pack path.
- **Next decision/check:** Confirm the supported `-LOC` discovery and install
  path with the game maintainer; then verify quest, book, and BIOG rendering
  in the client or explicitly document the delivery limitation.
- **As of:** 2026-10-14.

## Integration and verification gaps

### External-pack loading is not wired to a client boot path here

- **Status:** The loader and adapter APIs exist, but this repository contains
  no game boot call that invokes them. `Prefs/Locale` access is a host-client
  integration question; the adapter accepts a `baseUrl` and does not establish
  how browser/Electron code can fetch that directory.
- **Evidence:** [loader.js, `loadExternalPackFetch()`](../src/locale/loader.js#L147-L181);
  [locale-adapter.js, exports and `registerPack()`](../inject/locale-adapter.js#L21-L53);
  [overlay-external-fetch.test.js](../test/overlay-external-fetch.test.js#L23-L64);
  [inject/README.md, illustrative boot example and Prefs question](../inject/README.md#L20-L41).
- **Evidence class:** Code inspection and automated tests with an injected
  `fetchJson` stub; live-client/upstream behavior is unverified.
- **Impact:** Passing loader tests does not mean an installed pack is fetched
  or registered in the game.
- **Next decision/check:** Agree with the game maintainer on the boot hook and
  a supported path/URL for `Prefs/Locale`; verify the actual client calls the
  loader and handles failure by retaining English.
- **As of:** 2026-10-14.

### Locale switching does not implement host rerender or in-flight guarantees

- **Status:** Partial. `setLocale()` changes the locale module's state. The
  host must rerender open UI and invalidate its font/SDF atlas. This repository
  has no host renderer to do that, and no test here establishes that an
  in-flight trade, cast, or quest operation remains encoded/rendered under the
  old locale.
- **Evidence:** [locale.js, `setLocale()`](../src/locale/locale.js#L9-L20);
  [locale-adapter.js, exported `setLocale`](../inject/locale-adapter.js#L21-L24);
  [core-nucleus.test.js, locale setter tests](../test/core-nucleus.test.js#L81-L107);
  [inject/README.md, host-side switch responsibilities](../inject/README.md#L55-L62).
- **Evidence class:** Code inspection and automated module-level tests;
  host behavior and in-flight guarantees are unverified.
- **Impact:** A client that changes locale without redrawing may show mixed or
  stale UI; network/save safety during an in-flight operation is not proved by
  the current tests.
- **Next decision/check:** Define the host rerender/atlas invalidation hook and
  add client-level tests for open surfaces and in-flight operations before
  claiming the full switching contract.
- **As of:** 2026-10-14.

### The legacy publisher conflicts with the current branch policy

- **Status:** `publish-pack.mjs` is a dry-run by default; `--run`
  scrubs/copies probe assets, runs build/rebase steps, and stages pack/recipe
  artifacts plus a release-entry object. It does not itself publish or write
  `feed.json`. `publish-gates.mjs` is a legacy/low-level path that writes
  `packs/**`, commits, and pushes directly to `main` when run non-dry. That path
  is not approved under the current branch policy, which requires approved
  merges from `dev` into `main`; maintainer permission alone does not make it
  compliant. Reconcile the workflow and code before release use.
- **Evidence:** [publish-pack.mjs, `runPipeline()` and CLI](../tools/publish-pack.mjs#L147-L203);
  [publish-gates.mjs, `publishPack()`](../tools/publish-gates.mjs#L21-L56);
  [publish-pack.test.js](../test/publish-pack.test.js#L26-L49);
  [publish-gates.test.js](../test/publish-gates.test.js#L43-L89);
  [packs/README.md](../packs/README.md#L72-L98);
  [CONTRIBUTING.md, repository branch policy](../CONTRIBUTING.md#L66-L80).
- **Evidence class:** Code inspection and automated tests (the publishing
  test uses a local fixture repository, not the project remote).
- **Impact:** Treating staging as publishing can lead to unexpected local
  probe changes. The legacy helper can directly commit and push to `main`,
  bypassing the required approved-merge workflow.
- **Next decision/check:** Reconcile the helper and release workflow with the
  current branch policy before release use; do not treat authorization by
  itself as policy compliance.
- **As of:** 2026-10-14.

### The publisher can stage unrelated dirty files under `packs/`

- **Status:** `publishPack()` validates the supplied file paths and rejects
  dirty paths outside `packs/`, but then runs `git add packs`. Existing staged
  or unstaged changes anywhere under `packs/**` can therefore be committed
  along with the files supplied to the helper.
- **Evidence:** [publish-gates.mjs, dirty-tree filter and `git add packs`](../tools/publish-gates.mjs#L31-L52);
  [publish-gates.test.js](../test/publish-gates.test.js#L43-L89).
- **Evidence class:** Code inspection and automated tests; tests use temporary
  local repositories, not the project remote.
- **Impact:** Unrelated or unintended pack/feed files may be included in a
  commit and push if an operator assumes only the helper's `files` argument is
  staged.
- **Next decision/check:** Before any non-dry invocation, inspect the entire
  `packs/` working tree and index and clean or explicitly account for every
  pre-existing change. Reconcile the publisher workflow with branch policy
  before release use.
- **As of:** 2026-10-14.

### Dependency health needs a current review

- **Status:** Unknown. During updater dependency installation for this handoff,
  `npm ci` reported 11 advisories (8 moderate, 3 high). The `npm audit` details
  and applicability were not reviewed; this count does not establish that all
  11 advisories are exploitable or affect the shipped application.
- **Evidence:** [updater/package.json](../updater/package.json);
  [updater/package-lock.json](../updater/package-lock.json). The advisory count
  is an installation-time observation, not an audit disposition.
- **Evidence class:** Code inspection and dependency-install output; advisory
  applicability and maintainer disposition are unverified.
- **Impact:** The security and maintenance state of updater dependencies is
  not established by the root test suite.
- **Next decision/check:** Run `npm audit` from `updater/`, review each
  advisory for applicability and remediation, and record the disposition.
  Do not apply automatic dependency fixes as part of this documentation task.
- **As of:** 2026-10-14.

### German font rendering has not been proved

- **Status:** Unverified. Handjet declares a Latin range that includes the
  German characters `ä`, `ö`, `ü`, and `ß`; current font/SDF tests pin
  Cyrillic coverage and declarations, not those glyphs' actual font cmap or
  rendered output in the game client.
- **Evidence:** [handjet.js, Latin unicode range](../src/font/handjet.js#L15-L24);
  [coverage.js, RU SDF seed](../src/font/coverage.js#L1-L19);
  [handjet-stack.test.js](../test/handjet-stack.test.js#L6-L33);
  [sdf-coverage.test.js](../test/sdf-coverage.test.js#L5-L42).
- **Evidence class:** Code inspection and automated tests for the existing
  Cyrillic-oriented contract; German font cmap/rendering is unverified.
- **Impact:** A font-face range declaration does not prove that German text
  has usable glyphs in the packaged face or is rendered by the client.
- **Next decision/check:** Inspect the actual vendored font cmap for the four
  glyphs and verify their rendered output through an approved client/headless
  path before claiming German font support.
- **As of:** 2026-10-14.

### Test coverage does not equal client or release verification

- **Status:** Automated coverage is scoped to repository modules and fixtures.
  The external-fetch test injects a stub; the publisher tests use temporary
  fixtures. Neither exercises a live game client, installed updater, actual
  feed, or remote publication. The root package script is
  `node --test "test/*.test.js"`; updater modules also require dependencies
  installed from `updater/`.
- **Evidence:** [overlay-external-fetch.test.js](../test/overlay-external-fetch.test.js#L8-L21);
  [publish-gates.test.js, fixture repository](../test/publish-gates.test.js#L14-L35);
  [package.json, test script](../package.json);
  [updater/package.json](../updater/package.json).
- **Evidence class:** Automated test and code inspection; no live-client or
  release verification is implied.
- **Impact:** A green suite cannot alone establish correct client boot,
  rendered output, actual network behavior, or a successful published update.
- **Next decision/check:** Keep static tests distinct from live verification;
  use an authorized client/headless check where integration evidence is
  required, and record exactly which environment was checked.
- **As of:** 2026-10-14.

## Needs maintainer/upstream confirmation

### Client access to `Prefs/Locale` and external `-LOC` behavior

- **Status:** Unverified outside this repository. No code here establishes
  whether the target web/Electron client can fetch its user-data directory,
  where it loads quest/book/BIOG `-LOC` files from, or which client versions
  support those paths. A README example is illustrative, not an integration
  result.
- **Evidence:** [inject/README.md, example and unresolved path question](../inject/README.md#L20-L41);
  [loader.js, parameterized `baseUrl`](../src/locale/loader.js#L147-L181);
  [pack-ru.mjs, packaged directories](../tools/pack-ru.mjs#L26-L38).
- **Evidence class:** Unverified external behavior; repository code inspection
  and stub-based tests only.
- **Impact:** Installation and content-delivery instructions may not work
  unless the client exposes the assumed path and loader hooks.
- **Next decision/check:** Obtain a maintainer-confirmed integration contract,
  then verify it against the named client version without treating examples
  as proof.
- **As of:** 2026-10-14.

### Translation-text provenance and reuse scope are not established here

- **Status:** No rights conclusion is made in this register. The repository
  identifies Jagget's translation as a source, but the evidence reviewed here
  does not establish the scope of any rights for redistribution or derivative
  translations. Font licensing is a separate matter and must not be inferred
  from translation-text provenance.
- **Evidence:** [jagget-import.mjs, pinned source repository and commit](../tools/jagget-import.mjs#L1-L8);
  [Guildenstern NBP attribution](../vendor/guildenstern-nbp/ATTRIBUTION.md).
- **Evidence class:** Code/document inspection for tracked attribution;
  rights scope remains unverified and requires maintainer confirmation.
- **Impact:** A German maintainer must not assume existing RU text may be
  redistributed or used as a basis for derivative translations solely because
  it is present in the repository.
- **Next decision/check:** Before reusing the text, obtain and preserve
  documentary confirmation of the applicable redistribution and derivative
  translation scope. Do not change license terms based on this gap register.
- **As of:** 2026-10-14.
