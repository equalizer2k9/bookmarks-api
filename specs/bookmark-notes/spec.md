# Spec: Bookmark notes
Spec ID: SPEC-02
Status: draft
Supersedes: —

## Problem and user

The user of the bookmarks API is a client application (or a person calling the HTTP API directly)
that stores links. Today a bookmark has an id, a URL, a title, a creation timestamp and a list of
tags. There is nowhere to keep free-form text about a bookmark: why it was saved, a summary, a
reminder.

Today the API offers three operations: create a bookmark (`POST /bookmarks`, accepting `url`,
`title` and optional `tags`; any other body field is silently ignored), list bookmarks
(`GET /bookmarks`, newest first, optionally filtered by one `tag`), and delete a bookmark
(`DELETE /bookmarks/:id`, 204 on success, 404 with `{ "error": "not_found" }` for an unknown or
malformed id). There is no operation that changes an existing bookmark and no operation that
returns a single bookmark; the list is the only way to read bookmarks back. Invalid create bodies
are rejected with 400 and `{ "error": "invalid_body", "issues": { <field>: [<messages>] } }`.
Bookmarks live in memory only and do not survive a restart.

The user's request, verbatim: "a bookmark can have an optional note text, the note is editable,
and it should feel instant."

This feature lets a bookmark carry an optional note and lets the user change that note on an
existing bookmark.

## Goals / Non-goals

**Goals**

- G1. A bookmark can carry an optional note: a piece of free-form text.
- G2. The note of an existing bookmark can be edited (replaced with new text).
- G3. The user can read back the note they stored. *(How it is read depends on OQ-7.)*
- G4. Existing create, list and delete behaviour keeps working for callers that never use notes.
- G5. Editing a note "feels instant". *(What this means is undefined; see OQ-1. Not plannable
  until answered.)*

**Non-goals**

- NG1. Editing any other bookmark field (`url`, `title`, `tags`) — the request only makes the note
  editable.
- NG2. More than one note per bookmark, note threads, or note history / previous versions.
- NG3. Searching or filtering bookmarks by note text.
- NG4. Interpreting the note in any way (rendering markup, extracting links, sanitising HTML); the
  note is stored and returned as plain text.
- NG5. Persistence across restarts; bookmarks (and so notes) remain in memory as today.
- NG6. Any change to the ordering, filtering or pagination of the list endpoint.
- NG7. Client-side behaviour such as optimistic updates or local caching in a consuming app.
  *(Whether this is where "feel instant" belongs is OQ-1.)*

## User stories

- US-1. As an API user, I want a bookmark to be able to carry an optional note, so that I can keep
  context about why I saved a link.
- US-2. As an API user, I want to change the note of a bookmark I already saved, so that I can keep
  it up to date.
- US-3. As an API user, I want to remove the note from a bookmark, so that a bookmark can go back to
  having no note. *(Whether removal is in scope, and how it is expressed, is OQ-5.)*
- US-4. As an API user, I want to read back the note of my bookmarks, so that the stored text is
  useful. *(Depends on OQ-7.)*
- US-5. As an API user, I want a clear error when my note is malformed or the bookmark does not
  exist, so that I can fix the request instead of silently losing data.
- US-6. As an existing API user who does not use notes, I want creating, listing and deleting
  bookmarks to keep working as before.

## Acceptance criteria (EARS)

Representation

- AC-1 (US-1, US-4). WHERE a bookmark has a note the system shall return the note text, exactly as
  stored, in a `note` field of that bookmark in every response that returns the bookmark.
  *(Depends on OQ-6 for the field name, OQ-7 for which responses, OQ-8 for whether stored text is
  trimmed.)*
- AC-2 (US-1, US-6). WHERE a bookmark has no note the system shall represent the absence of a note
  in its responses in one consistent way. *(Depends on OQ-6: field omitted, `null`, or `""`.)*

Setting a note on creation

- AC-3 (US-1). WHEN a create request contains a valid note the system shall respond 201 with the
  created bookmark carrying that note. *(Depends on OQ-3: whether a note can be given on creation
  at all.)*
- AC-4 (US-1, US-6). WHEN a create request omits the note the system shall create the bookmark with
  no note and respond 201, as today.
- AC-5 (US-5). IF a create request contains a note that is not a string THEN the system shall
  respond 400 and create no bookmark. *(Depends on OQ-3; on OQ-5 for whether `null` is accepted as
  "no note".)*
- AC-6 (US-5). IF a create request contains a note longer than the maximum note length THEN the
  system shall respond 400 and create no bookmark. *(Depends on OQ-3 and OQ-4.)*
- AC-7 (US-5). WHEN the system rejects a create request because of its note the system shall respond
  with the existing invalid-body error shape, `error` equal to `invalid_body`, with a `note` key
  present under `issues`. *(Depends on OQ-3.)*

Editing a note

- AC-8 (US-2). WHEN an edit request sets a valid note on an existing bookmark the system shall
  replace that bookmark's note with the new text. *(Depends on OQ-2 for the operation's method and
  path.)*
- AC-9 (US-2). WHEN an edit request sets a valid note on an existing bookmark that has no note the
  system shall give the bookmark that note. *(Depends on OQ-2.)*
- AC-10 (US-2). WHEN an edit request succeeds the system shall respond with a success status and
  body as decided in OQ-9.
- AC-11 (US-2, US-4). WHEN an edit request has succeeded the system shall return the new note for
  that bookmark in every later response that includes notes. *(Depends on OQ-7.)*
- AC-12 (US-2). WHEN an edit request changes a bookmark's note the system shall leave the
  bookmark's id unchanged.
- AC-13 (US-2). WHEN an edit request changes a bookmark's note the system shall leave the bookmark's
  `url`, `title` and `tags` unchanged.
- AC-14 (US-2). WHEN an edit request changes a bookmark's note the system shall leave the bookmark's
  `createdAt` unchanged. *(Depends on OQ-10: whether an update timestamp is introduced.)*
- AC-15 (US-2, US-6). WHEN an edit request changes a bookmark's note the system shall keep the
  bookmark in the same position of the newest-first list as before the edit.
- AC-16 (US-3). WHEN an edit request clears the note of an existing bookmark the system shall
  return that bookmark as having no note (AC-2) in every later response. *(Depends on OQ-5 for how
  clearing is expressed and whether it is in scope.)*

Edit errors

- AC-17 (US-5). IF an edit request targets an id that no bookmark has THEN the system shall respond
  404 with `{ "error": "not_found" }`, the same shape the delete operation uses today. *(Depends on
  OQ-2.)*
- AC-18 (US-5). IF an edit request targets a malformed id THEN the system shall respond 404 with
  `{ "error": "not_found" }`, as the delete operation does today. *(Depends on OQ-2.)*
- AC-19 (US-5). IF an edit request contains a note that is neither a string nor the agreed clearing
  value THEN the system shall respond 400. *(Depends on OQ-5.)*
- AC-20 (US-5). IF an edit request contains a note longer than the maximum note length THEN the
  system shall respond 400. *(Depends on OQ-4.)*
- AC-21 (US-5). WHEN the system rejects an edit request because of its body the system shall respond
  with the existing invalid-body error shape, `error` equal to `invalid_body`, with a `note` key
  present under `issues`.
- AC-22 (US-5, NFR-2). WHEN the system rejects an edit request with 400 or 404 the system shall
  leave every stored bookmark, including its note, unchanged.
- AC-23 (US-5). IF an edit request has no `note` field (including an empty body) THEN the system
  shall respond as decided in OQ-11.

Unchanged behaviour

- AC-24 (US-6, NFR-1). WHEN a list request is made the system shall return bookmarks in the same
  order and with the same `tag` filtering as today, regardless of their notes.
- AC-25 (US-6, NFR-1). The system shall keep the existing behaviour of deleting a bookmark (204 on
  success, 404 for an unknown or malformed id) unchanged, regardless of the bookmark's note.
- AC-26 (US-5). WHEN a bookmark has been deleted the system shall respond 404 to an edit request for
  that bookmark's id. *(Depends on OQ-2.)*
- AC-27 (US-6, NFR-1). WHEN a create request succeeds today without a note the system shall still
  respond 201 with all fields it returns today, unchanged in value.

## Edge cases

- E1. Note omitted on create — bookmark has no note (AC-4).
- E2. Note given on create — accepted only if OQ-3 allows it (AC-3).
- E3. Note is `""` — either a valid empty note, a clear, or a 400 (OQ-5).
- E4. Note is `null` — either a clear / "no note", or a 400 (OQ-5).
- E5. Note is a number, boolean, array or object — 400 (AC-5, AC-19).
- E6. Note only whitespace, or with leading/trailing whitespace — stored as sent, trimmed, or
  rejected (OQ-8).
- E7. Note exactly at the maximum length accepted, one character over rejected (AC-6, AC-20; the
  limit and its unit — characters, code points or bytes — are OQ-4).
- E8. Note containing newlines, tabs, non-ASCII text, emoji or control characters (including NUL)
  — accepted or rejected per OQ-8.
- E9. Very large note (e.g. megabytes) — rejected by the maximum length (OQ-4); the server's
  existing request body-size limit still applies.
- E10. Edit request for an unknown id, a malformed id, or a bookmark deleted earlier — 404
  (AC-17, AC-18, AC-26).
- E11. Edit request with no `note` field or an empty body (OQ-11, AC-23).
- E12. Edit request carrying other fields (`url`, `title`, `tags`, `id`, `createdAt`) — those fields
  never change the bookmark (AC-12, AC-13, NG1); whether they are ignored or cause a 400 is OQ-12.
- E13. Edit request that sets the same note the bookmark already has — succeeds; observable state
  unchanged (AC-8).
- E14. Two edit requests for the same bookmark arriving close together — which one wins (OQ-13).
- E15. Edit request racing a delete of the same bookmark — the edit either succeeds before the
  delete or returns 404 after it; it never re-creates the bookmark (AC-26).

## Non-functional requirements

- NFR-1. Backwards compatibility: every request that succeeds today shall still succeed with the
  same status code and the same fields; the only change in successful response bodies is the note
  representation (subject to OQ-6, OQ-7).
- NFR-2. Note validation happens at the HTTP boundary, before any bookmark is stored or changed; a
  rejected request leaves the stored bookmarks unchanged.
- NFR-3. Editing a note "should feel instant" (user's words). No AC can verify this until it is
  turned into a measurable target or declared out of scope — see OQ-1.

## Inputs and provenance

| Input | Provenance |
|---|---|
| Note text in the create request body | [new: request field supplied by the API caller; no external call] *(only if OQ-3 allows it)* |
| Note text in the edit request body | [new: request field supplied by the API caller; no external call] |
| Bookmark id targeted by the edit request | [new: path parameter supplied by the API caller, same form as the existing delete operation's id] |
| Stored note on a bookmark | [deterministic: the last valid note text set by create or edit, or none] |
| Bookmark `id`, `url`, `title`, `tags`, `createdAt` | [reused: the existing "create a bookmark" operation] |
| Bookmark list, newest first, optional tag filter | [reused: the existing "list bookmarks" operation] |
| Lookup of a bookmark by id | [reused: the existing in-memory bookmark collection, as used by "delete a bookmark"] |
| Invalid-body and not-found error shapes | [reused: the existing 400 `invalid_body` and 404 `not_found` responses] |

No model or third-party service is called by this feature.

## Untrusted inputs

- The note text in the create and edit request bodies — caller-supplied free-form text; it is data,
  not instructions. It is validated for type and length, stored, and returned verbatim; it is never
  interpreted or executed. Clients that render it are responsible for escaping it.
- The bookmark id in the edit request path — caller-supplied; validated and used only to look up a
  bookmark.
- The existing untrusted inputs (`url`, `title`, `tags`, the `tag` query parameter, the delete id)
  are unchanged.

None of these inputs reaches a model, so no delimiters or injection guard are required.

## Open questions

Requirement without AC:

- [NEEDS CLARIFICATION: requirement without AC — NFR-3: editing a note "should feel instant";
  verifiable only with a latency target stating the operation(s) covered, the percentile, the
  threshold with unit (e.g. ms), the environment and load it is measured in — or a decision that
  "instant" is a client concern and out of scope for this API.] (= OQ-1)

Questions (none answered yet; the ACs that reference them are not final):

- OQ-1. [NEEDS CLARIFICATION: What does "it should feel instant" mean for this backend API?
  Options: (a) a server-side latency target for the edit (and/or list) operation — which
  percentile (p50 / p95 / p99), what threshold in ms, measured where (in-process test injection,
  local server, deployed environment) and under what load and data size; (b) a client concern
  (optimistic UI, local caching) and out of scope for the API, NFR-3 then dropped; (c) a
  behavioural requirement such as "the edit response already contains the updated bookmark so the
  client needs no follow-up read" (ties to OQ-9). Affects G5, NFR-3, NG7, possibly AC-10.]
  This one changes scope and should be answered before planning.
- OQ-2. [NEEDS CLARIFICATION: Which operation edits the note? Options: (a) `PATCH /bookmarks/:id`
  with a body containing `note` (opens the door to editing other fields later, see NG1/OQ-12);
  (b) `PUT /bookmarks/:id/note` as a dedicated sub-resource; (c) `PUT /bookmarks/:id` replacing the
  whole bookmark (conflicts with NG1). Also: is the not-found response for unknown and malformed
  ids the same 404 `not_found` as delete? Affects AC-8, AC-9, AC-17, AC-18, AC-26.]
- OQ-3. [NEEDS CLARIFICATION: Can a note be given when creating a bookmark, or only set later by
  editing? Affects AC-3, AC-5, AC-6, AC-7, E2.]
- OQ-4. [NEEDS CLARIFICATION: What is the maximum note length, and in what unit (characters,
  Unicode code points, UTF-8 bytes)? Is there a minimum length? Affects AC-6, AC-20, E7, E9.]
- OQ-5. [NEEDS CLARIFICATION: Can a note be removed, and how? Options: (a) sending `null` clears it;
  (b) sending `""` clears it; (c) a separate delete operation on the note; (d) removal not in
  scope. Is `""` a valid stored note, a clear, or a 400? Is `null` on create "no note" or a 400?
  Affects US-3, AC-5, AC-16, AC-19, E3, E4.]
- OQ-6. [NEEDS CLARIFICATION: How does a bookmark without a note appear in responses — `note`
  field omitted, `note: null`, or `note: ""`? Is `note` the field name? Affects AC-1, AC-2,
  NFR-1.]
- OQ-7. [NEEDS CLARIFICATION: Do notes appear in list responses? The list is currently the only way
  to read bookmarks back. Options: (a) yes, every bookmark in the list carries its note; (b) no,
  and a new single-bookmark read operation (e.g. `GET /bookmarks/:id`) is added to read the note;
  (c) no, and the note is visible only in create/edit responses. Affects G3, US-4, AC-1, AC-11,
  NFR-1.]
- OQ-8. [NEEDS CLARIFICATION: Is note text stored exactly as sent, or trimmed (as the title is
  today)? Is a whitespace-only note allowed? Are newlines, tabs, control characters (including
  NUL) and any Unicode allowed? Affects AC-1, E6, E8.]
- OQ-9. [NEEDS CLARIFICATION: What does a successful edit return? Options: (a) 200 with the full
  updated bookmark; (b) 200 with only the note; (c) 204 with no body. Affects AC-10, possibly
  OQ-1.]
- OQ-10. [NEEDS CLARIFICATION: Does editing a note record when it happened (e.g. an update
  timestamp on the bookmark), or does nothing besides the note change? Affects AC-14.]
- OQ-11. [NEEDS CLARIFICATION: What happens when an edit request has no `note` field or an empty
  body — 400, or a successful no-op? Affects AC-23, E11.]
- OQ-12. [NEEDS CLARIFICATION: If an edit request carries other fields (`url`, `title`, `tags`,
  `id`, `createdAt`), are they silently ignored (as the create endpoint ignores unknown fields
  today) or rejected with 400? Affects E12.]
- OQ-13. [NEEDS CLARIFICATION: For concurrent edits of the same note, is last-write-wins acceptable,
  or must the API detect conflicting edits (e.g. a version or precondition check returning 409 /
  412)? Affects E14.]
