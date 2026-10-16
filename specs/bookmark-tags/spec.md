# Spec: Bookmark tags
Spec ID: SPEC-01
Status: approved
Supersedes: —

## Problem and user

The user of the bookmarks API is a client application (or a person calling the HTTP API directly)
that stores links. Today a bookmark has only an id, a URL, a title and a creation timestamp. The
list endpoint `GET /bookmarks` returns every bookmark, newest first, with no way to narrow it. A
user with many bookmarks cannot group them by topic or fetch just one topic.

Today the create request `POST /bookmarks` accepts `url` and `title`; any other body field,
including a `tags` field, is silently ignored. Invalid bodies are rejected with status 400 and a
body of the form `{ "error": "invalid_body", "issues": { <field>: [<messages>] } }`. The list
endpoint ignores all query parameters. Bookmarks live in memory only and do not survive a restart.

This feature lets the user attach tags to a bookmark when creating it, and filter the list by one
tag.

## Goals / Non-goals

**Goals**

- G1. A user can give an optional list of tags when creating a bookmark.
- G2. Tags are normalised: case-insensitive, stored lowercase, duplicates collapsed into one.
- G3. Tags are validated: each 1 to 30 characters of letters, digits and hyphens; at most 10 per
  bookmark.
- G4. `GET /bookmarks?tag=<tag>` returns only the bookmarks that carry that tag.
- G5. `GET /bookmarks` without the `tag` parameter behaves exactly as today.

**Non-goals**

- NG1. Adding, removing or editing tags on an existing bookmark (no update endpoint is
  introduced).
- NG2. Filtering by more than one tag in a single request (no AND / OR combinations, no
  comma-separated lists).
- NG3. Listing all known tags, tag counts, tag renaming or tag deletion as standalone operations.
- NG4. Prefix, substring or fuzzy matching of tags; matching is exact after case folding.
- NG5. Persistence across restarts; bookmarks (and so tags) remain in memory as today.
- NG6. Pagination or any other change to the list endpoint's ordering or shape beyond what is
  stated here.

## User stories

- US-1. As an API user, I want to send a list of tags when I create a bookmark, so that I can group
  my bookmarks by topic.
- US-2. As an API user, I want tags that differ only in letter case (`Node`, `node`, `NODE`) to be
  treated as the same tag, so that I do not end up with accidental near-duplicates.
- US-3. As an API user, I want to request `GET /bookmarks?tag=node` and receive only the bookmarks
  tagged `node`, so that I can browse one topic.
- US-4. As an API user, I want a clear 400 error when my tags are malformed, so that I can fix the
  request instead of silently losing data.
- US-5. As an existing API user who does not use tags, I want creating and listing bookmarks to keep
  working as before.

## Acceptance criteria (EARS)

Creation

- AC-1. WHEN a create request contains a valid `tags` array the system shall respond 201 with the
  created bookmark, whose `tags` field holds the normalised tags.
- AC-2. WHEN a create request omits `tags` the system shall create the bookmark and respond 201, as
  today. *(Depends on OQ-1 for the response shape.)*
- AC-3. The system shall include a `tags` field, an array of strings, in every bookmark returned by
  the create endpoint and by the list endpoint. *(Depends on OQ-1.)*
- AC-4. WHEN a bookmark is created without tags the system shall return `tags` as an empty array
  `[]` for that bookmark. *(Depends on OQ-1.)*
- AC-5. WHEN a create request contains `tags` as an empty array the system shall create the
  bookmark with no tags and respond 201.
- AC-6. WHEN a create request contains tags with upper-case letters the system shall store and
  return those tags in lower case (e.g. `Node` is stored as `node`).
- AC-7. WHEN a create request contains tags that are equal after lower-casing the system shall keep
  exactly one of them (e.g. `["Node", "node", "NODE"]` is stored as `["node"]`).
- AC-8. The system shall return a bookmark's tags in the order of each tag's first occurrence in the
  create request, after lower-casing and de-duplication. *(Depends on OQ-5.)*
- AC-9. The system shall return a bookmark's tags in every later list response unchanged from what
  the create response returned.

Tag validation on creation

- AC-10. IF any tag in a create request is shorter than 1 character THEN the system shall respond
  400 and create no bookmark.
- AC-11. IF any tag in a create request is longer than 30 characters THEN the system shall respond
  400 and create no bookmark.
- AC-12. IF any tag in a create request contains a character other than a letter, a digit or a
  hyphen THEN the system shall respond 400 and create no bookmark. *(Depends on OQ-6 for what
  counts as a letter, OQ-7 for surrounding whitespace, OQ-8 for hyphen placement.)*
- AC-13. IF a create request has more than 10 distinct tags after lower-casing and de-duplication
  THEN the system shall respond 400 and create no bookmark. *(Depends on OQ-2.)*
- AC-14. WHEN a create request has more than 10 tag entries that collapse to 10 or fewer distinct
  tags after lower-casing and de-duplication the system shall create the bookmark and respond 201.
  *(Depends on OQ-2.)*
- AC-15. IF `tags` in a create request is present but is not an array of strings (for example a
  single string, a number, `null`, or an array containing a non-string) THEN the system shall
  respond 400 and create no bookmark. *(Depends on OQ-10 for `null`.)*
- AC-16. WHEN the system rejects a create request because of its tags the system shall respond with
  the existing invalid-body error shape, `error` equal to `invalid_body`, with a `tags` key present
  under `issues`.
- AC-17. WHEN a create request is invalid in both `tags` and another field the system shall report
  every invalid field under `issues` in the same 400 response, as it does today for `url` and
  `title`.

Listing and filtering

- AC-18. WHEN a list request has no `tag` query parameter the system shall return all bookmarks,
  newest first, as today.
- AC-19. WHEN a list request has exactly one `tag` query parameter with a valid tag value the system
  shall return only the bookmarks whose tags include that tag.
- AC-20. WHEN a list request filters by tag the system shall order the matching bookmarks newest
  first, the same order as the unfiltered list.
- AC-21. WHEN a list request filters by a tag value with upper-case letters the system shall match it
  case-insensitively (e.g. `?tag=Node` returns bookmarks tagged `node`). *(Depends on OQ-4.)*
- AC-22. WHEN a list request filters by a valid tag that no bookmark carries the system shall respond
  200 with an empty array.
- AC-23. WHEN a list request filters by tag the system shall return each matching bookmark with all
  of its tags, not only the filtered one.
- AC-24. IF the `tag` query parameter is present with an empty value (`?tag=`) THEN the system shall
  respond 400. *(Depends on OQ-3.)*
- AC-25. IF the `tag` query parameter value is not a valid tag (longer than 30 characters, or
  containing a character other than a letter, a digit or a hyphen) THEN the system shall respond
  400. *(Depends on OQ-3.)*
- AC-26. IF the `tag` query parameter is given more than once in one request (e.g.
  `?tag=a&tag=b`, including `?tag=a&tag=a`) THEN the system shall respond 400. *(Depends on OQ-3.)*
- AC-27. WHEN the system rejects a list request because of its `tag` parameter the system shall
  respond with a body whose `error` field is `invalid_query`, with a `tag` key present under
  `issues`. *(Depends on OQ-9.)*
- AC-28. WHEN a list request contains query parameters other than `tag` the system shall ignore
  them, as today.

Unchanged behaviour

- AC-29. The system shall keep the existing behaviour of deleting a bookmark (204 on success, 404
  for an unknown or malformed id) unchanged, regardless of the bookmark's tags.
- AC-30. WHEN a tagged bookmark is deleted the system shall no longer return it in any filtered or
  unfiltered list.

## Edge cases

- E1. `tags` omitted, `tags: []` — bookmark has no tags (AC-2, AC-4, AC-5).
- E2. `tags: null` — rejected with 400 by decision (AC-15, OQ-10).
- E3. `tags: "node"` (a string, not an array) — rejected with 400 (AC-15).
- E4. `tags: [""]` — rejected, a tag must have at least 1 character (AC-10).
- E5. A tag of exactly 30 characters is accepted; 31 is rejected (AC-11).
- E6. Exactly 10 distinct tags accepted; 11 distinct rejected (AC-13).
- E7. 11 or more entries that collapse to 10 or fewer distinct tags — accepted by decision
  (AC-14, OQ-2).
- E8. Mixed-case duplicates `["Go", "go"]` — stored once as `["go"]` (AC-7).
- E9. Tags with spaces, underscores, dots, slashes, emoji or other punctuation — rejected (AC-12).
- E10. Tags with surrounding whitespace such as `" node "` — rejected by decision; not
  trimmed (OQ-7).
- E11. Non-ASCII letters such as `café` or `ñ` — rejected by decision (OQ-6).
- E12. Tags that are only hyphens or start/end with a hyphen (`-`, `-node`, `a--b`) — accepted by
  proposed default (OQ-8).
- E13. `?tag=` (empty), `?tag=a&tag=b`, `?tag=a%20b`, `?tag=` + 31 characters — all rejected with
  400 (AC-24 to AC-26).
- E14. `?tag=NODE` — matches bookmarks tagged `node` by decision (AC-21, OQ-4).
- E15. Filter matches no bookmark — 200 with `[]` (AC-22).
- E16. Bookmark is deleted — disappears from every filtered list (AC-30).
- E17. A very large `tags` array (e.g. thousands of entries) in a create request — the request is
  rejected with 400 if more than 10 distinct tags remain; the body-size limit the server already
  enforces still applies. Question: should a raw `tags` array longer than some bound be
  rejected before normalisation, regardless of duplicates? See OQ-2.]

## Non-functional requirements

- NFR-1. Backwards compatibility: every request that succeeds today shall still succeed with the
  same status code; the only change in successful response bodies is the added `tags` field
  (AC-3, subject to OQ-1).
- NFR-2. Validation of tags and of the `tag` query parameter happens at the HTTP boundary, before
  any bookmark is stored; a rejected create request leaves the stored bookmarks unchanged.
- NFR-3. The list endpoint's filtering is done over the in-memory bookmarks with no additional
  external calls.
- NFR-4. The existing checks of the project (the test suite and the type check) shall pass, with
  new tests covering the acceptance criteria above.

## Inputs and provenance

| Input | Provenance |
|---|---|
| `tags` field of the create request body | [new: request field supplied by the API caller; no external call] |
| Normalised tag list stored on a bookmark | [deterministic: lower-case each tag, drop later duplicates, keep first-occurrence order] |
| `tag` query parameter of the list request | [new: query parameter supplied by the API caller; no external call] |
| Bookmark `url`, `title`, `id`, `createdAt` | [reused: the existing "create a bookmark" operation] |
| Full bookmark list, newest first | [reused: the existing "list bookmarks" operation] |
| Filtered bookmark list | [deterministic: the existing list, kept in its order, restricted to bookmarks whose tags include the lower-cased filter value] |
| Invalid-body error shape | [reused: the existing 400 `invalid_body` response with per-field `issues`] |

No model or third-party service is called by this feature.

## Untrusted inputs

- The `tags` array in the create request body — caller-supplied data, not instructions. It is
  validated against the tag rules before storage and is never interpreted.
- The `tag` query parameter of the list request — caller-supplied data, not instructions. It is
  validated against the same tag rules and used only for an exact equality comparison.
- The existing untrusted inputs (`url`, `title`, the `id` path parameter) are unchanged.

None of these inputs reaches a model, so no delimiters or injection guard are required.

## Open questions

None open. Each question below was answered by the user on 2026-10-16 by accepting the proposed
default; they are kept as a decision record, and the acceptance criteria that reference them stand.

- OQ-1. Question: Do bookmark responses (create and list) always include `tags`, and as
  `[]` when none were given — or is the field omitted when empty? Decision: always
  included, `[]` when none. Affects AC-2, AC-3, AC-4, NFR-1.
- OQ-2. Question: Does the limit of 10 tags apply after lower-casing and de-duplication,
  or to the raw entries sent? Should a raw array beyond some size be rejected regardless? Decision: the limit applies to distinct tags after normalisation; no separate raw-array
  limit beyond the server's existing body-size limit. Affects AC-13, AC-14, E7, E17.
- OQ-3. Question: How is an invalid, empty or repeated `tag` query parameter handled —
  400, or ignored (treated as no filter), or empty result? Decision: 400 for an empty
  value, an invalid value, and any repetition (including the same value twice). Affects AC-24,
  AC-25, AC-26.
- OQ-4. Question: Is the filter value lower-cased before matching, so `?tag=Node`
  matches `node`? Decision: yes, matching is case-insensitive. Affects AC-21.
- OQ-5. Question: In what order are a bookmark's stored tags returned — first-occurrence
  order of the request, or sorted alphabetically? Decision: first-occurrence order after
  normalisation. Affects AC-8.
- OQ-6. Question: Are "letters" ASCII `a`–`z` / `A`–`Z` only, or any Unicode letter? Decision: ASCII letters only. Affects AC-12, E11.
- OQ-7. Question: Is surrounding whitespace on a tag trimmed (as the title is today) or
  is it a validation error? Decision: not trimmed; whitespace makes the tag invalid.
  Affects AC-12, E10.
- OQ-8. Question: Are leading, trailing or consecutive hyphens, or a tag made only of
  hyphens, allowed? Decision: allowed — the requirement restricts only the character set
  and length. Affects AC-12, E12.
- OQ-9. Question: What is the error body for a rejected `tag` query parameter? Decision: `{ "error": "invalid_query", "issues": { "tag": [<messages>] } }`, mirroring
  the existing invalid-body shape. Affects AC-27.
- OQ-10. Question: Is `tags: null` treated as "no tags" or rejected? Decision:
  rejected with 400; only omission or an array is accepted. Affects AC-15, E2.
