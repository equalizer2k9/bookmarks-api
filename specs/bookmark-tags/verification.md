# Verification: Bookmark tags

## Inputs

- Spec: `specs/bookmark-tags/spec.md` (SPEC-01)
- Plan: `specs/bookmark-tags/plan.md`
- Branch: `feat/bookmark-tags` · base `04084f9` · head `6424cb4`

## Matrix

One row per AC of the spec, in spec order. Test file `bt` = `test/bookmark-tags.test.ts`; `routes` = `src/routes/bookmarks.routes.ts`; `service` = `src/service/bookmarks.service.ts`.

| AC | Task(s) | Test (file › case) | Commit | Evidence (file:line) | Status |
|---|---|---|---|---|---|
| AC-1 | T-4 | `bt` › valid tags → 201 with normalised tags | `1ab7fde`, `6424cb4` | `routes:5,12-17,41`; `service:24-31`; `bt:65-70` | PASS |
| AC-2 | T-3 | `bt` › create without tags → 201 and tags is []; `test/bookmarks.test.ts` › creates a bookmark and lists it | `1ab7fde` | `routes:17`; `service:30`; `bt:35-40`; `test/bookmarks.test.ts:8-19` | PASS |
| AC-3 | T-3 | `bt` › every bookmark in create and list responses has a tags array of strings | `1ab7fde` | `src/store/bookmarks.store.ts:6`; `service:30`; `bt:42-56` | PASS |
| AC-4 | T-3 | `bt` › create without tags → 201 and tags is [] | `1ab7fde` | `service:30`; `bt:35-40` | PASS |
| AC-5 | T-4 | `bt` › tags: [] → 201 with tags [] | `1ab7fde`, `6424cb4` | `routes:12-17`; `src/service/tags.ts:2-4`; `bt:72-77` | PASS |
| AC-6 | T-2, T-4 | `test/tags.test.ts` › lower-cases tags; `bt` › upper-case tags are stored lower-case | `1ab7fde` | `src/service/tags.ts:3`; `service:30`; `test/tags.test.ts:5-7`; `bt:79-84` | PASS |
| AC-7 | T-2, T-4 | `test/tags.test.ts` › collapses case-insensitive duplicates to one; `bt` › mixed-case duplicates kept once | `1ab7fde` | `src/service/tags.ts:3`; `test/tags.test.ts:9-11`; `bt:86-91` | PASS |
| AC-8 | T-2, T-4 | `test/tags.test.ts` › keeps first-occurrence order; `bt` › tags returned in first-occurrence order | `1ab7fde` | `src/service/tags.ts:3`; `test/tags.test.ts:13-15`; `bt:93-97` | PASS |
| AC-9 | T-4 | `bt` › list returns the same tags as the create response | `1ab7fde` | `src/store/bookmarks.store.ts:19-23`; `service:20`; `bt:99-103` | PASS |
| AC-10 | T-4 | `bt` › empty-string tag → 400 | `1ab7fde` | `routes:5,38-40`; `bt:58-63,105-107` | PASS |
| AC-11 | T-4 | `bt` › 30-char tag accepted, 31-char tag → 400 | `1ab7fde` | `routes:5`; `bt:109-114` | PASS |
| AC-12 | T-4 | `bt` › tags with disallowed characters → 400; hyphen-only and edge hyphens accepted | `1ab7fde` | `routes:5`; `bt:116-126` | PASS |
| AC-13 | T-4 | `bt` › 10 distinct tags accepted, 11 distinct → 400 | `6424cb4` | `routes:7,14-16`; `bt:128-134` | PASS |
| AC-14 | T-4 | `bt` › 12 entries collapsing to ≤10 distinct → 201 | `6424cb4` | `routes:14`; `bt:136-141` | PASS |
| AC-15 | T-4 | `bt` › non-array tags → 400 | `1ab7fde`, `6424cb4` | `routes:12-17`; `bt:143-147` | PASS |
| AC-16 | T-4 | `bt` › tag rejection uses invalid_body with a tags issue | `1ab7fde` | `routes:39`; `bt:149-156` | PASS |
| AC-17 | T-4 | `bt` › invalid tags and url reported together | `1ab7fde` | `routes:39`; `bt:158-162` | PASS |
| AC-18 | T-5 | `bt` › no tag param → all bookmarks newest first | `1ab7fde` | `service:20-22`; `bt:176-179` | PASS |
| AC-19 | T-5 | `bt` › ?tag=node returns only bookmarks tagged node | `1ab7fde` | `routes:29-33`; `service:21-22`; `bt:181-186` | PASS |
| AC-20 | T-5 | `bt` › filtered list is newest first | `1ab7fde` | `service:20-22`; `bt:188-191` | PASS |
| AC-21 | T-5 | `bt` › ?tag=NODE and ?tag=Node match node | `1ab7fde` | `service:21`; `bt:193-198` | PASS |
| AC-22 | T-5 | `bt` › valid tag with no matches → 200 [] | `1ab7fde` | `service:22`; `bt:200-205` | PASS |
| AC-23 | T-5 | `bt` › filtered bookmarks carry all their tags | `1ab7fde` | `service:22`; `bt:207-212` | PASS |
| AC-24 | T-5 | `bt` › ?tag= (empty) → 400 | `1ab7fde` | `routes:5,20,29-32`; `bt:216-219` | PASS |
| AC-25 | T-5 | `bt` › invalid tag value → 400 | `1ab7fde` | `routes:5,20,29-32`; `bt:221-226` | PASS |
| AC-26 | T-5 | `bt` › repeated tag param → 400 | `1ab7fde` | `routes:20,29-32`; `bt:228-233`. Verifier: needs runtime check (relies on Fastify's default query parser) → ran `node --test test/bookmark-tags.test.ts`: "repeated tag param → 400" ✔, 31 pass / 0 fail | PASS |
| AC-27 | T-5 | `bt` › query rejection body is invalid_query with a tag issue | `1ab7fde` | `routes:31`; `bt:214,235-243` | PASS |
| AC-28 | T-5 | `bt` › other query params are ignored | `1ab7fde` | `routes:20`; `bt:245-249` | PASS |
| AC-29 | T-6 | `bt` › deleting a tagged bookmark → 204, again → 404, malformed id → 404 | `1ab7fde` | `routes:44-50`; `service:32`; `bt:251-257` | PASS |
| AC-30 | T-6 | `bt` › deleted tagged bookmark disappears from filtered and unfiltered lists | `1ab7fde` | `src/store/bookmarks.store.ts:24`; `service:20`; `bt:259-265` | PASS |

## Open rows

None (all 30 ACs PASS).

Non-AC row the verifier marked PARTIAL: **T-4 implementation differs from the plan.** The plan specifies `z.array(Tag).transform(normaliseTags).pipe(z.array(z.string()).max(10))` with the route importing `normaliseTags`. After review fix round 1 the route instead uses `.refine` over a lower-cased `Set` (`routes:12-17`), and only the service normalises (`service:30`). AC-13/AC-14 behaviour is the same. To close it: update the plan's T-4 to describe the refine approach, or revert to the planned transform (which reopens review finding W-1).

## Architecture review

- Rule documents judged against: `CLAUDE.md` (no ARCHITECTURE.md, AGENTS.md, docs/architecture or ADRs found).
- Rounds run: 1 fix round (initial review + re-review of fix commit `6424cb4`).
- Fixed: W-1 `src/routes/bookmarks.routes.ts:11`: the route's Zod `.transform(normaliseTags)` ran normalisation in the routes layer as well as the service. Closed in `6424cb4`: the route no longer imports `normaliseTags` and the service normalises once.
- CRITICAL / major still open:
  - W-2 (WARNING, from the re-review) `src/routes/bookmarks.routes.ts:14`: the route's `.refine` repeats the "lower-case, then de-duplicate" rule from `normaliseTags` (`src/service/tags.ts:3`). The rule now has two copies that could drift apart. No CLAUDE.md rule is broken. **Not sent to a second fix round:** both remedies the reviewer offered change what an AC means. Moving the distinct-count check into the service (with a typed error) breaks AC-17, which requires every invalid field in one 400, and NFR-2, which requires validation at the HTTP boundary. Counting raw entries breaks AC-14. Left for the user to decide.
- minor findings, as shown to the user:
  - S-1 `src/service/bookmarks.service.ts:2`: the service interface returns the store's `Bookmark` type, so the storage shape is the API response shape. This predates the change; no CLAUDE.md rule covers it.
  - S-2 `src/service/tags.ts:1`: the file name breaks the `<name>.service.ts` pattern of its neighbour. No naming rule is documented.

## Checks

| Command | Directory | Result |
|---|---|---|
| `npm test` | repo root | pass: 39 tests, 0 fail (after `1ab7fde` and after `6424cb4`) |
| `npm run typecheck` | repo root | pass: `tsc --noEmit`, no errors (after `1ab7fde` and after `6424cb4`) |
| `node --test test/bookmark-tags.test.ts` | repo root | pass: 31 pass, 0 fail (AC-26 runtime check) |

## Deviations

Group: single package (T-1 to T-6, one implementer).

- Implementation (`1ab7fde`): no deviations reported. The README table cells also describe the `tags` limits, slightly more than the plan asked for.
- Fix round 1 (`6424cb4`): T-4's route schema changed from the planned `transform`/`pipe` to `z.array(Tag).refine(distinct ≤ MAX_DISTINCT_TAGS).optional()` and gained an unplanned `MAX_DISTINCT_TAGS` constant (`routes:7`). The custom message is `at most 10 distinct tags`. The tags that reach the service are now raw, and the service normalises them.
