# Plan: Bookmark tags

Spec: specs/bookmark-tags/spec.md (SPEC-01)

## Goal

Let `POST /bookmarks` take an optional `tags` array. The route checks each tag (1–30 ASCII letters, digits or hyphens), lower-cases the list, removes duplicates in first-occurrence order and allows at most 10 distinct tags. Every returned bookmark carries `tags` (`[]` when none). Add an exact, case-insensitive `?tag=` filter to `GET /bookmarks` that keeps the existing newest-first order. A bad filter value gets a 400 `invalid_query` response. The routes → service → store layering stays as it is, and Zod stays in `src/routes`.

## Files

| path | new/modify | what changes | AC |
|---|---|---|---|
| `src/app.ts` | modify | `buildApp` options gain an optional `now?: () => Date`, passed to `createBookmarkService(store, now)` (the service already accepts it, `src/service/bookmarks.service.ts:15`). Tests use it to get a predictable newest-first order. | enables AC-8, AC-18, AC-20 tests |
| `src/service/tags.ts` | new | A pure helper `normaliseTags(tags: readonly string[]): string[]`: lower-cases each tag, drops later duplicates and keeps first-occurrence order. No Zod import. | AC-6, AC-7, AC-8, AC-13, AC-14, AC-21 |
| `src/store/bookmarks.store.ts` | modify | `Bookmark` interface (`:1-6`) gains `tags: string[]`. The store's behaviour does not change. | AC-3, AC-9 |
| `src/service/bookmarks.service.ts` | modify | `NewBookmark` (`:4-7`) gains `tags?: string[]`. `create` (`:18-19`) stores `normaliseTags(tags ?? [])`. `list` (`:10`, `:17`) becomes `list(filter?: { tag?: string })`: it sorts as today, then keeps only the bookmarks whose `tags` include `tag.toLowerCase()` when a tag is given. | AC-2, AC-3, AC-4, AC-5, AC-9, AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-30 |
| `src/routes/bookmarks.routes.ts` | modify | Adds a tag string schema (`/^[A-Za-z0-9-]+$/`, min 1, max 30) shared by the body and the query. `CreateBookmarkBody` (`:5-8`) gains `tags: z.array(Tag).optional()`, then a transform through `normaliseTags` and a max-10 check on the result. Adds a new `ListBookmarksQuery = z.object({ tag: Tag.optional() })`. The GET handler (`:16`) safe-parses `request.query` and returns 400 `{ error: 'invalid_query', issues }` on failure. | AC-1, AC-5 – AC-8, AC-10 – AC-17, AC-19, AC-21, AC-24 – AC-28 |
| `test/tags.test.ts` | new | Unit tests for `normaliseTags`. | AC-6, AC-7, AC-8 |
| `test/bookmark-tags.test.ts` | new | `fastify.inject` suite covering the feature, using `buildApp({ now })` with a counter clock. | AC-1 – AC-30 |
| `test/bookmarks.test.ts` | unchanged | The existing tests must still pass without edits. This is the NFR-1 regression guard. | AC-2, AC-18, AC-29 |
| `README.md` | modify | Endpoints table (`:8-12`): document the `tags` body field, `?tag=` and the `invalid_query` 400. | — (docs) |

## Tasks

### T-1 — Injectable clock in the composition root
AC: — (enables T-3, T-4, T-5, T-6)
Files: `src/app.ts`, `test/bookmark-tags.test.ts`
Test: `test/bookmark-tags.test.ts`. First, add the shared helpers:
- a `clock()` factory that returns a `() => Date` going forward 1 s per call from a fixed epoch;
- `create(app, payload)`, mirroring `test/bookmarks.test.ts:5-6`;
- `list(app, qs)`.

Then add the case "buildApp uses the injected clock for createdAt", which asserts that two creations get strictly increasing `createdAt` values equal to the clock's outputs.
Implementation: `buildApp(options: { logger?: boolean; now?: () => Date } = {})` passes `options.now` to `createBookmarkService` (`src/app.ts:7-9`). Leaving it out keeps today's default (`src/service/bookmarks.service.ts:15`).
Verify: `node --test test/bookmark-tags.test.ts`, then `npm run typecheck`, both in the repo root. The test runner is from `package.json:9` (`node --test test/*.test.ts`, narrowed to one file). The typecheck is from `CLAUDE.md` and `package.json:10`.
Depends on: —

### T-2 — `normaliseTags` helper
AC: AC-6, AC-7, AC-8
Files: `src/service/tags.ts`, `test/tags.test.ts`
Test: `test/tags.test.ts`, written first, with these cases:
- "lower-cases tags": `['Node','TypeScript']` → `['node','typescript']`.
- "collapses case-insensitive duplicates to one": `['Node','node','NODE']` → `['node']`.
- "keeps first-occurrence order": `['b','A','a','c','B']` → `['b','a','c']`.
- "returns [] for []".
- "does not mutate its input".

Implementation: `export function normaliseTags(tags: readonly string[]): string[]`. It has no Zod and no I/O, and uses erasable syntax only.
Verify: `node --test test/tags.test.ts`, then `npm run typecheck`, in the repo root (sources as in T-1).
Depends on: —

### T-3 — `tags` on the bookmark model; always present in responses
AC: AC-2, AC-3, AC-4
Files: `src/store/bookmarks.store.ts`, `src/service/bookmarks.service.ts`, `test/bookmark-tags.test.ts`
Test: `test/bookmark-tags.test.ts`, written first, with these cases:
- "create without tags → 201 and tags is []": covers AC-2 and AC-4.
- "every bookmark in create and list responses has a tags array of strings": covers AC-3. It creates one bookmark with tags (enabled by T-4; until then, assert on an untagged one) and one without, and checks that `Array.isArray(b.tags)` is true for the create responses and for every element of `GET /bookmarks`.

Implementation:
- Add `tags: string[]` to `Bookmark` (`src/store/bookmarks.store.ts:1-6`).
- Add `tags?: string[]` to `NewBookmark` (`src/service/bookmarks.service.ts:4-7`).
- `create` stores `tags: normaliseTags(tags ?? [])` (`:18-19`). Normalising again in the service is idempotent and keeps the service contract for any caller that does not come through HTTP.
Verify: `node --test test/bookmark-tags.test.ts`, then `npm test` (to prove `test/bookmarks.test.ts` still passes unchanged), then `npm run typecheck`, in the repo root.
Depends on: T-1, T-2

### T-4 — Validate and normalise `tags` in the create route
AC: AC-1, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17
Files: `src/routes/bookmarks.routes.ts`, `test/bookmark-tags.test.ts`
Test: `test/bookmark-tags.test.ts`, written first. Every 400 case also asserts that a later `GET /bookmarks` returns `[]`, which proves "create no bookmark" (NFR-2). Cases:
- "valid tags → 201 with normalised tags": `['node','api']` → `tags` is `['node','api']` (AC-1).
- "tags: [] → 201 with tags []" (AC-5).
- "upper-case tags are stored lower-case": `['Node']` → `['node']`, and the same in the list (AC-6).
- "mixed-case duplicates kept once": `['Node','node','NODE']` → `['node']` (AC-7).
- "tags returned in first-occurrence order": `['b','A','a','c']` → `['b','a','c']` (AC-8).
- "list returns the same tags as the create response": `deepEqual` of the list element with the created body (AC-9).
- "empty-string tag → 400": `['']` (AC-10).
- "30-char tag accepted, 31-char tag → 400" (AC-11, E5).
- "tags with disallowed characters → 400", run as a loop over `'a b'`, `' node '`, `'a_b'`, `'a.b'`, `'a/b'`, `'café'`, `'ñ'` and an emoji (AC-12, E9–E11).
- "hyphen-only and edge hyphens accepted": `['-','-node','a--b']` → 201 (AC-12, OQ-8, E12).
- "10 distinct tags accepted, 11 distinct → 400" (AC-13, E6).
- "12 entries collapsing to ≤10 distinct → 201": for example 10 distinct plus `'A'`/`'B'` repeats of existing tags (AC-14, E7).
- "non-array tags → 400", run as a loop over `'node'`, `42`, `null`, `['ok', 1]` (AC-15, E2, E3).
- "tag rejection uses invalid_body with a tags issue": `body.error === 'invalid_body'` and `'tags' in body.issues`, checked for at least the AC-10, AC-13 and AC-15 cases (AC-16).
- "invalid tags and url reported together": `{ url: 'not a url', title: 'x', tags: [''] }` → the sorted issue keys equal `['tags','url']` (AC-17).

Implementation:
- Add `const Tag = z.string().min(1).max(30).regex(/^[A-Za-z0-9-]+$/)` in the routes file.
- In `CreateBookmarkBody` (`:5-8`), add `tags: z.array(Tag).transform(normaliseTags).pipe(z.array(z.string()).max(10)).optional()`. The 10-limit then applies after de-duplication (OQ-2).
- Import `normaliseTags` from `../service/tags.ts`. Routes may import from `src/service` (`CLAUDE.md`).
- Leave the 400 branch (`:20-22`) unchanged. `z.flattenError(...).fieldErrors` keys issues by the first path segment, so `tags.0` errors and pipe errors both land under `tags`.
Verify: `node --test test/bookmark-tags.test.ts`, then `npm test`, then `npm run typecheck`, in the repo root.
Depends on: T-2, T-3

### T-5 — `?tag=` filter on the list endpoint
AC: AC-18, AC-19, AC-20, AC-21, AC-22, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28
Files: `src/service/bookmarks.service.ts`, `src/routes/bookmarks.routes.ts`, `test/bookmark-tags.test.ts`
Test: `test/bookmark-tags.test.ts`, written first. The fixture is created with the T-1 clock: A `['node','api']`, B `['go']`, C `['node']`, D `[]`, in that order. Cases:
- "no tag param → all bookmarks newest first": `[D,C,B,A]` (AC-18).
- "?tag=node returns only bookmarks tagged node": ids equal `{C,A}` (AC-19).
- "filtered list is newest first": exactly `[C,A]` in that order (AC-20).
- "?tag=NODE and ?tag=Node match node" (AC-21, E14).
- "valid tag with no matches → 200 []": `?tag=rust` (AC-22, E15).
- "filtered bookmarks carry all their tags": A in `?tag=api` has `['node','api']` (AC-23).
- "?tag= (empty) → 400" (AC-24).
- "invalid tag value → 400": 31 characters, `a%20b`, `a_b` (AC-25, E13).
- "repeated tag param → 400": `?tag=a&tag=b` and `?tag=node&tag=node` (AC-26).
- "query rejection body is invalid_query with a tag issue", checked for each of the AC-24, AC-25 and AC-26 cases (AC-27).
- "other query params are ignored": `?foo=bar` gives the full list, and `?foo=bar&tag=go` gives `[B]` (AC-28).

Implementation:
- Service: `list(filter?: { tag?: string }): Bookmark[]`. Sort as at `:17`; when `filter?.tag` is set, filter by `b.tags.includes(filter.tag.toLowerCase())`. The service takes plain values only.
- Route: `const ListBookmarksQuery = z.object({ tag: Tag.optional() })`. Zod's default object strips unknown keys, which gives AC-28.
- Fastify's query parser turns a repeated key into an array, and the `z.string()` behind `Tag` rejects an array, which gives AC-26.
- The GET handler (`:16`) becomes `async (request, reply)`: safe-parse `request.query`, return 400 `{ error: 'invalid_query', issues: z.flattenError(err).fieldErrors }` on failure, otherwise return `service.list({ tag })`.
Verify: `node --test test/bookmark-tags.test.ts`, then `npm test`, then `npm run typecheck`, in the repo root.
Depends on: T-1, T-3, T-4

### T-6 — Delete regression with tags, README, full checks
AC: AC-29, AC-30
Files: `test/bookmark-tags.test.ts`, `README.md`
Test: `test/bookmark-tags.test.ts`, with these cases:
- "deleting a tagged bookmark → 204, again → 404, malformed id → 404" (AC-29). Malformed id: `DELETE /bookmarks/not-a-uuid`, the path at `src/routes/bookmarks.routes.ts:27-29`.
- "deleted tagged bookmark disappears from filtered and unfiltered lists": create `['node']`, delete it, then `?tag=node` and `GET /bookmarks` both return `[]` (AC-30, E16).

These should pass without production changes because delete (`src/service/bookmarks.service.ts:20`) is untouched. If one fails, fix the regression; never weaken the test.
README: update the endpoints table (`README.md:8-12`) to show the `tags` body field, `?tag=` and the `400 invalid_query` response.
Verify: `npm test`, then `npm run typecheck`, in the repo root (`CLAUDE.md`: both must pass).
Depends on: T-5

## Traceability

| AC | task(s) | test (file › case) |
|---|---|---|
| AC-1 | T-4 | test/bookmark-tags.test.ts › valid tags → 201 with normalised tags |
| AC-2 | T-3 | test/bookmark-tags.test.ts › create without tags → 201 and tags is []; test/bookmarks.test.ts › creates a bookmark and lists it (unchanged) |
| AC-3 | T-3 | test/bookmark-tags.test.ts › every bookmark in create and list responses has a tags array of strings |
| AC-4 | T-3 | test/bookmark-tags.test.ts › create without tags → 201 and tags is [] |
| AC-5 | T-4 | test/bookmark-tags.test.ts › tags: [] → 201 with tags [] |
| AC-6 | T-2, T-4 | test/tags.test.ts › lower-cases tags; test/bookmark-tags.test.ts › upper-case tags are stored lower-case |
| AC-7 | T-2, T-4 | test/tags.test.ts › collapses case-insensitive duplicates to one; test/bookmark-tags.test.ts › mixed-case duplicates kept once |
| AC-8 | T-2, T-4 | test/tags.test.ts › keeps first-occurrence order; test/bookmark-tags.test.ts › tags returned in first-occurrence order |
| AC-9 | T-4 | test/bookmark-tags.test.ts › list returns the same tags as the create response |
| AC-10 | T-4 | test/bookmark-tags.test.ts › empty-string tag → 400 |
| AC-11 | T-4 | test/bookmark-tags.test.ts › 30-char tag accepted, 31-char tag → 400 |
| AC-12 | T-4 | test/bookmark-tags.test.ts › tags with disallowed characters → 400; hyphen-only and edge hyphens accepted |
| AC-13 | T-4 | test/bookmark-tags.test.ts › 10 distinct tags accepted, 11 distinct → 400 |
| AC-14 | T-4 | test/bookmark-tags.test.ts › 12 entries collapsing to ≤10 distinct → 201 |
| AC-15 | T-4 | test/bookmark-tags.test.ts › non-array tags → 400 |
| AC-16 | T-4 | test/bookmark-tags.test.ts › tag rejection uses invalid_body with a tags issue |
| AC-17 | T-4 | test/bookmark-tags.test.ts › invalid tags and url reported together |
| AC-18 | T-5 | test/bookmark-tags.test.ts › no tag param → all bookmarks newest first |
| AC-19 | T-5 | test/bookmark-tags.test.ts › ?tag=node returns only bookmarks tagged node |
| AC-20 | T-5 | test/bookmark-tags.test.ts › filtered list is newest first |
| AC-21 | T-5 | test/bookmark-tags.test.ts › ?tag=NODE and ?tag=Node match node |
| AC-22 | T-5 | test/bookmark-tags.test.ts › valid tag with no matches → 200 [] |
| AC-23 | T-5 | test/bookmark-tags.test.ts › filtered bookmarks carry all their tags |
| AC-24 | T-5 | test/bookmark-tags.test.ts › ?tag= (empty) → 400 |
| AC-25 | T-5 | test/bookmark-tags.test.ts › invalid tag value → 400 |
| AC-26 | T-5 | test/bookmark-tags.test.ts › repeated tag param → 400 |
| AC-27 | T-5 | test/bookmark-tags.test.ts › query rejection body is invalid_query with a tag issue |
| AC-28 | T-5 | test/bookmark-tags.test.ts › other query params are ignored |
| AC-29 | T-6 | test/bookmark-tags.test.ts › deleting a tagged bookmark → 204, again → 404, malformed id → 404 |
| AC-30 | T-6 | test/bookmark-tags.test.ts › deleted tagged bookmark disappears from filtered and unfiltered lists |

T-1 enables the ordering assertions in T-3 through T-6. It has its own check: "buildApp uses the injected clock for createdAt".

## Skills for the implementer

| skill | task(s) | why |
|---|---|---|
| engineering-paved-path:zod | T-4, T-5 | `z.array(...).transform(...).pipe(...)`, `.optional()` versus `null`, `z.flattenError` field keys for nested and array paths, and stripping of unknown object keys. |
| engineering-paved-path:fastify-best-practices | T-1, T-5, T-6 | Query-string parsing (repeated keys become arrays, empty values), handler `reply.code().send()` patterns and `inject` testing. |

No project skills exist under `.claude/skills/`.

## Risks

| risk | where (file:line) | mitigation |
|---|---|---|
| Bookmarks created in the same millisecond tie in the sort. `localeCompare` returns 0, so insertion order wins and the newest-first assertions become flaky. | `src/service/bookmarks.service.ts:17` | T-1 injects a counter clock through `buildApp({ now })`. All ordering tests use it. |
| A layering violation if the route imports the store, or Zod leaks into the service. | `CLAUDE.md`; `src/routes/bookmarks.routes.ts:3` | The route imports only `../service/tags.ts` (pure, no Zod) and the service type. The store stays untouched apart from the `Bookmark` type. The tag regex and schemas stay in the routes file. |
| Normalisation lives in two places, the route transform and the service `create`. | `src/service/bookmarks.service.ts:18-19` | Both call the single `normaliseTags`, which is idempotent. The route must normalise because AC-13 counts distinct tags at the HTTP boundary (NFR-2). The service normalises so that non-HTTP callers keep the "stored lowercase" rule. |
| If the max-10 check ran before de-duplication, it would reject AC-14 inputs. | `src/routes/bookmarks.routes.ts:5-8` | Apply `.max(10)` in the `.pipe` after `.transform(normaliseTags)`, never on the raw array. The AC-14 test guards this. |
| `z.string().regex` with an ASCII class: a Unicode flag or `\w` would wrongly allow `_` or accented letters. | `src/routes/bookmarks.routes.ts` (new `Tag`) | Use the literal `/^[A-Za-z0-9-]+$/` with no `u`/`i` flag. The AC-12 loop includes `a_b`, `café`, `ñ` and an emoji. |
| Fastify's default query parser could hand Zod an array for repeated keys or an empty string for `?tag=`. If it collapsed repeats, AC-26 would silently pass the wrong way. | `src/routes/bookmarks.routes.ts:16` | Tests cover both `?tag=a&tag=b` and `?tag=node&tag=node`. The string schema rejects arrays. Do not add a custom `querystringParser`. |
| Typecheck: `fastify.inject`'s `payload` type and `request.query` are typed `unknown`. | `test/bookmarks.test.ts:5-6` | Copy the existing `payload as Record<string, unknown>` cast. Always go through `safeParse` and never cast `request.query`. |
| Node type stripping: enums, namespaces, parameter properties and imports without the `.ts` extension fail at runtime even if `tsc` passes. | `tsconfig.json:9-10`; `CLAUDE.md` | Use only interfaces, type aliases and functions, and write every import with `.ts`, as at `src/app.ts:2-4`. |
| Never-touch: `package-lock.json` and the dependency versions. | `package.json:12-19`; `CLAUDE.md` | No new dependencies are needed (zod 4.6.7 and fastify 5.12.7 cover everything). Do not edit `package.json` or the lock file. |
| Never weaken existing tests. `test/bookmarks.test.ts:18` deep-equals list against created, and still passes once both carry `tags: []`. | `test/bookmarks.test.ts:8-34` | Leave the file unchanged. It is the NFR-1 regression proof. |

## Out of scope

- **A separate rule that tag normalisation lives only in the service.** CLAUDE.md puts validation at the routes layer, and AC-13 needs the post-normalisation count at the boundary. So the plan shares one pure helper instead of moving validation into the service.
- **Fastify JSON-schema / `fastify-type-provider-zod` integration.** The project validates by hand with `safeParse` in the handlers (`src/routes/bookmarks.routes.ts:19,27`). Keeping that pattern avoids a new dependency.
- **Copying tag arrays defensively in the store.** No endpoint mutates bookmarks (NG1), so shared references cannot be observed.
- **Separate service-level unit tests for `list`/`create`.** The `inject` suite covers every AC end to end, and `test/tags.test.ts` covers the only new pure logic.
