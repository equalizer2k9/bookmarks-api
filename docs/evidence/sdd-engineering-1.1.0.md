# Evidence — update to sdd-engineering 1.1.0

## Update

`claude plugin marketplace update dev-digest-ai-marketplace` refreshed the catalog: its copy of
`sdd-engineering/.claude-plugin/plugin.json` now says `1.1.0`, at marketplace commit `2102ece`. The
installed plugin did not change:

```text
before / after `marketplace update`
  sdd-engineering@dev-digest-ai-marketplace          1.0.0                project  enabled
  engineering-paved-path@dev-digest-ai-marketplace   1.0.0-2349d7e28a33   project  enabled
  research-tools@dev-digest-ai-marketplace           1.0.0-2349d7e28a33   project  enabled
  architecture-review@dev-digest-ai-marketplace      1.0.0-2349d7e28a33   project  enabled
```

`claude plugin update sdd-engineering@dev-digest-ai-marketplace --scope project` →
`Plugin "sdd-engineering" updated from 1.0.0 to 1.1.0 for scope project`:

```text
after `plugin update`
  sdd-engineering@dev-digest-ai-marketplace          1.1.0                project  enabled
  engineering-paved-path@dev-digest-ai-marketplace   1.0.0-2349d7e28a33   project  enabled   (unchanged)
  research-tools@dev-digest-ai-marketplace           1.0.0-2349d7e28a33   project  enabled   (unchanged)
  architecture-review@dev-digest-ai-marketplace      1.0.0-2349d7e28a33   project  enabled   (unchanged)
```

- `claude plugin list` reports no dependency errors.
- `.claude/settings.json` did not change: `enabledPlugins` is keyed by plugin id, not version.

## New session (headless, stream-json)

```bash
claude -p "Prepare a spec for bookmark notes (feature name: bookmark-notes): a bookmark can have an optional note text, the note is editable, and it should feel instant." \
  --output-format stream-json --verbose --setting-sources project,local \
  --permission-mode acceptEdits --allowedTools Read Glob Grep Agent Write Skill --max-budget-usd 1.0
```

`system/init`:

```text
model claude-opus-5-5 · claude_code_version 2.1.301
sdd-engineering         ~/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.1.0
engineering-paved-path  ~/.claude/plugins/cache/dev-digest-ai-marketplace/engineering-paved-path/1.0.0-2349d7e28a33
research-tools          ~/.claude/plugins/cache/dev-digest-ai-marketplace/research-tools/1.0.0-2349d7e28a33
architecture-review     ~/.claude/plugins/cache/dev-digest-ai-marketplace/architecture-review/1.0.0-2349d7e28a33
```

Calls: `main → Agent sdd-engineering:spec-creator` → `Write specs/bookmark-notes/spec.md`.

## What spec-creator 1.1.0 did

- Wrote `specs/bookmark-notes/spec.md` as `SPEC-02`, `Status: draft`.
- **Requirements numbered:** `US-1`…`US-6`, `NFR-1`…`NFR-3`.
- **ACs name what they cover.** There are 27 ACs, each with the requirements it covers, e.g.
  `AC-1 (US-1, US-4)` and `AC-4 (US-1, US-6)`.
- **Coverage check** (requirements vs. the IDs named by ACs): every requirement is named by at least
  one AC except **NFR-3** — editing a note "should feel instant".
- **The new behaviour.** NFR-3 is not given an invented threshold. It is listed under Open questions:
  `[NEEDS CLARIFICATION: requirement without AC — NFR-3: editing a note "should feel instant";
  verifiable only with a latency target … — or a decision that "instant" is a client concern and out
  of scope for this API.]`
- **Result.** The spec stays `draft`, and the agent reports it as "not ready for an implementation
  plan yet". 13 other open questions remain about the feature's shape (edit endpoint, limits).
  1.0.0 would have marked "fast" as unclear without tying any requirement to its ACs; see the
  marketplace release note for 1.1.0.
- No code paths in the spec (`grep 'src/\|\.ts'` is empty).

The spec stays a draft: this step stops at the spec. No plan or code.

## Cost

| Step | Cost | Duration |
|---|---|---|
| spec session (sdd-engineering 1.1.0) | $0.63 | 128 s |
