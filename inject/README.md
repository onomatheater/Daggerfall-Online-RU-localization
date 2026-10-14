# Client integration guide

`inject/locale-adapter.js` is an adapter module in this repository. Parts of
its API/helper behavior are unit-tested here, but this repository does not
contain a game-client boot call that loads or invokes the adapter. The examples
below describe the current module interface; they are illustrative integration
patterns, not drop-in client instructions or evidence of an upstream client
change. Confirm call sites, module paths, and host hooks against the exact game
client revision before integrating.

See [Architecture](../docs/ARCHITECTURE.md) for the component boundaries and
[Known gaps](../docs/KNOWN-GAPS.md) for the current evidence and unresolved
client questions.

## Adapter API in this repository

`inject/locale-adapter.js` exports:

- `setGameVersion(version)` — records the game version string used as the
  default compatibility input for pack registration.
- `registerPack({ manifest, tables }, version?)` — validates the RU manifest
  and game-version compatibility, then registers its tables in the adapter's
  in-memory overlay. It returns `{ ok: true, version }` or
  `{ ok: false, reason }` when manifest/version validation fails. The adapter's
  pack locale is currently fixed to `ru`.
- `wrapLiteral(key, params?, fallback?)` and
  `wrapTemplate(key, params?, fallback?)` — resolve a pack value when present,
  otherwise use the bundled locale resolver. An explicit `fallback` is used
  for a key missing from both the pack and bundled dictionaries.
- `wrapPlural(key, count, params?, locale?)` — resolves a pack plural-form
  object or delegates to bundled `tp()`. The supported plural data and selector
  are RU-specific; this is not a general ICU parser.
- Re-exports from `src/locale/locale.js`: `t`, `tp`, `getLocale`, `hasKey`,
  `splitKey`, and `setLocale`.

No game boot path calls this module, and access to `Prefs/Locale` remains
unconfirmed; the helper exports do not establish either integration hook.

Illustrative wrapper calls (the helper signatures are covered by
[`loader-adapter.test.js`](../test/loader-adapter.test.js) and
[`adapter-pack.test.js`](../test/adapter-pack.test.js)):

```js
wrapLiteral('strings:youSee', { s: name });
wrapTemplate('strings:thingJustDied', { s: name });
wrapPlural('strings:someKey', count, params);
```

These examples show adapter calls, not verified edits to a current game-client
call site. Do not infer that a particular upstream literal, filename, line
number, import path, or boot module matches without checking that client's
source revision. The adapter's source comments describe the relative-import
mapping needed for a proposed upstream placement; the mapping test checks those
comments/layout strings, not an actual upstream integration.

The locale module starts in English. `setLocale('ru')` changes its locale
state; it does not load/register a pack or trigger a host UI redraw. Pack
registration and locale selection are separate actions.

## Host-client responsibilities and switching contract

The adapter's `setLocale()` only changes locale-module state. A host-client
integration that adopts locale switching must also arrange to:

- redraw currently open UI surfaces as appropriate; and
- invalidate/rebuild any font or SDF atlas whose glyph coverage depends on
  displayed text.

Neither responsibility is implemented by this adapter or established by its
unit tests. A locale switch is intended to remain client-local, without
changing network messages, saves, or gameplay IDs; the repository's host-side
integration does not prove that behavior. In particular, the required
in-flight trade/cast/quest behavior—an operation already underway is not
recoded or retransmitted in a different locale, with the current frame allowed
to finish in its original presentation—is not established by a test here.
Treat these as host integration requirements to implement and verify, not as
current guarantees.

## Pack-loading helpers and their evidence

There are two tested helper boundaries; neither is wired into game startup by
this repository:

- `loadExternalPackFetch({ baseUrl, gameVersion, bundled, fetchJson })` from
  [`src/locale/loader.js`](../src/locale/loader.js) is a browser-oriented
  helper. It asks the injected `fetchJson` function for `locale-version.json`
  and `ru.json`, validates the RU manifest/version, and returns an overlay or
  `{ ok: false, reason }`. `fetchJson` is injected rather than bound to a
  browser global. [`overlay-external-fetch.test.js`](../test/overlay-external-fetch.test.js)
  uses a stub; it proves helper behavior with that stub, not access to a real
  user-data directory, network request, or live client.
- `readPackDir()` and `loadExternalPack()` from
  [`tools/load-pack.mjs`](../tools/load-pack.mjs) read the same manifest and
  `ru.json` from a local directory using Node.js filesystem APIs. They are
  tooling helpers, not browser APIs or proof that the game can read those
  files.

The `Prefs/Locale` path is not confirmed as accessible to the browser/Electron
client. The loader accepts a caller-supplied `baseUrl`, but this does not
establish a URL scheme, permission, or host bridge for the client's user-data
directory. A maintainer-confirmed access mechanism and boot hook are needed
before writing client instructions around that path.

The external JSON loader handles a manifest and `ru.json` tables only. It does
not consume packaged quest/book `-LOC` files; their separate game-client
loading path remains outside this repository and unverified. German is not
currently supported by this fixed-RU adapter and loader path.

## Tests and limits

- [`adapter-pack.test.js`](../test/adapter-pack.test.js) exercises adapter pack
  registration, compatibility rejection, wrapper fallback, and plural
  delegation.
- [`loader-adapter.test.js`](../test/loader-adapter.test.js) exercises
  representative bundled wrapper values and checks adapter import-map
  comments/layout text.
- [`overlay-external-fetch.test.js`](../test/overlay-external-fetch.test.js)
  exercises external-fetch helper validation and overlay results with a stub.

These are module/helper tests, not tests of game boot wiring, `Prefs/Locale`
access, an upstream call site, visible UI redraw, font-atlas invalidation,
`-LOC` consumption, network/save behavior in a live session, or in-flight
operations. Confirm each such integration point with the client maintainer and
appropriate client-level evidence before describing it as implemented.
