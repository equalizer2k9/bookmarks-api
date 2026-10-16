# Rollback rehearsal — stable channel (1.0.0) and back

Rehearsed on 2026-10-16 (UTC) with Claude Code 2.1.301, at project scope. The procedure is the one in
[dev-digest-ai-marketplace `docs/RELEASES.md` → Rollback](https://github.com/equalizer2k9/dev-digest-ai-marketplace/blob/main/docs/RELEASES.md#rollback).

The two channels are two marketplaces with different names:

- **latest:** `dev-digest-ai-marketplace`, from `main`.
- **stable:** `dev-digest-ai-marketplace-stable`, from branch `stable`, which is the 1.0.0 release
  (`2349d7e`) plus a rename commit.

## Timing

| Phase | From → to (UTC) | Duration |
|---|---|---|
| Switch to stable (first command → `plugin list` shows stable enabled) | 20:08:29 → 20:09:03 | **34 s** |
| Rollback to a green smoke (first command → clean smoke done) | 20:08:29 → 20:13:40 | **5 min 11 s** |
| Return to latest (first command → new session's init shows 1.1.0) | 20:13:53 → 20:14:04 | **11 s** |

The 5 min 11 s includes a failed `plugin eval` attempt (15 s), a smoke run invalidated by repository
content (below) and its diagnosis, and the clean smoke (109 s). Without those detours, the rollback
is the 34 s switch plus one smoke session of about 2 min.

## 0. Before — latest, sdd-engineering 1.1.0

```text
$ claude plugin list --json   (dev-digest entries)
  architecture-review@dev-digest-ai-marketplace       1.0.0-2349d7e28a33  enabled
  engineering-paved-path@dev-digest-ai-marketplace    1.0.0-2349d7e28a33  enabled
  research-tools@dev-digest-ai-marketplace            1.0.0-2349d7e28a33  enabled
  sdd-engineering@dev-digest-ai-marketplace           1.1.0               enabled
```

## 1. Switch to stable

```text
[20:08:30] $ claude plugin disable sdd-engineering@dev-digest-ai-marketplace --scope project
           ✔ Successfully disabled plugin: sdd-engineering (scope: project)
[20:08:31] $ claude plugin disable architecture-review@dev-digest-ai-marketplace --scope project      ✔
[20:08:31] $ claude plugin disable research-tools@dev-digest-ai-marketplace --scope project           ✔
[20:08:32] $ claude plugin disable engineering-paved-path@dev-digest-ai-marketplace --scope project   ✔
[20:08:33] $ claude plugin marketplace add equalizer2k9/dev-digest-ai-marketplace#stable --scope project
           ✔ Successfully added marketplace: dev-digest-ai-marketplace-stable (declared in project settings)
[20:08:37] $ claude plugin install sdd-engineering@dev-digest-ai-marketplace-stable --scope project
           ✔ Successfully installed plugin: sdd-engineering@dev-digest-ai-marketplace-stable (scope: project)
             (+ 3 dependencies: engineering-paved-path, research-tools, architecture-review)
[20:09:03] $ claude plugin list --json   (dev-digest entries)
  architecture-review@dev-digest-ai-marketplace            1.0.0-2349d7e28a33  disabled
  architecture-review@dev-digest-ai-marketplace-stable     1.0.0-2349d7e28a33  enabled
  engineering-paved-path@dev-digest-ai-marketplace         1.0.0-2349d7e28a33  disabled
  engineering-paved-path@dev-digest-ai-marketplace-stable  1.0.0-2349d7e28a33  enabled
  research-tools@dev-digest-ai-marketplace                 1.0.0-2349d7e28a33  disabled
  research-tools@dev-digest-ai-marketplace-stable          1.0.0-2349d7e28a33  enabled
  sdd-engineering@dev-digest-ai-marketplace                1.1.0               disabled
  sdd-engineering@dev-digest-ai-marketplace-stable         1.0.0               enabled
  `claude plugin list`: 0 dependency-error lines
```

In stable, the dependencies resolved inside the stable channel. Their `^1.0.0` constraints resolved
to the `*--v1.0.0` tags (`-2349d7e28a33`).

## 2. Smoke

**Attempt 1 — `claude plugin eval` against the installed plugin: does not work.**

```text
$ claude plugin eval sdd-engineering@dev-digest-ai-marketplace-stable --case spec-due-date --runs 1 --scaffold …
✗ ~/.claude/plugins/cache/dev-digest-ai-marketplace-stable/sdd-engineering/1.0.0/evals/spec-due-date:
  case "spec-due-date": plugins entry "../../../engineering-paved-path" does not exist
```

- The case's `plugins:` paths assume the repository layout (`plugins/<name>/evals/<case>`).
- The installed copy lives at `cache/<marketplace>/<plugin>/<version>/`, so `../../../engineering-paved-path`
  points to a directory that doesn't exist. The dependency is at
  `cache/<marketplace>/engineering-paved-path/1.0.0-2349d7e28a33`.
- The suite can only run from a checkout of the marketplace repository. Cost: $0.

**Attempt 2 — headless smoke** with a spec request that includes "should be fast":

```bash
claude -p "Prepare a spec for searching bookmarks (feature name: bookmark-search): GET /bookmarks?q=<text> returns the bookmarks whose title contains the text, case-insensitively; an empty q is rejected; results keep their order. Search should be fast." \
  --output-format stream-json --verbose --setting-sources project,local \
  --permission-mode acceptEdits --allowedTools Read Glob Grep Agent Write Skill --max-budget-usd 0.9
```

`system/init`:

```text
sdd-engineering         ~/.claude/plugins/cache/dev-digest-ai-marketplace-stable/sdd-engineering/1.0.0
engineering-paved-path  ~/.claude/plugins/cache/dev-digest-ai-marketplace-stable/engineering-paved-path/1.0.0-2349d7e28a33
research-tools          ~/.claude/plugins/cache/dev-digest-ai-marketplace-stable/research-tools/1.0.0-2349d7e28a33
architecture-review     ~/.claude/plugins/cache/dev-digest-ai-marketplace-stable/architecture-review/1.0.0-2349d7e28a33
```

- **Run 1 ($0.61) — not valid as a behaviour check.** `main → Agent sdd-engineering:spec-creator` →
  `specs/bookmark-search/spec.md`. The spec contained 1.1.0-style output: requirement IDs on ACs and
  "requirement without AC".
  - The loaded prompt is 1.0.0: `…-stable/sdd-engineering/1.0.0/agents/spec-creator.md` has 0
    "Requirement coverage" sections, against 1 in the 1.1.0 cache.
  - The stream shows that spec-creator read `specs/bookmark-notes/spec.md`, which spec-creator
    1.1.0 had written. It copied that spec's format, as it is told to follow existing specs in the
    area.
  - **Lesson:** a behaviour smoke must not run in a tree that holds artifacts of the newer version.
- **Run 2 ($0.54) — valid.** `specs/bookmark-notes/` was moved out of the tree for the run and put
  back afterwards. spec-creator read only `specs/bookmark-tags/spec.md`, a 1.0.0-era spec. Result
  in `specs/bookmark-search/spec.md`:
  - "requirement without AC": **0**
  - ACs that name `US-`/`NFR-` IDs: **0**
  - "fast" is handled the 1.0.0 way: `G5. Search is "fast". [NEEDS CLARIFICATION: … gives no …]`
  - `Status: draft`

  This is 1.0.0 behaviour. With the init line, it proves the stable channel serves 1.0.0.

Both smoke specs were rehearsal output and were removed from the tree; nothing from them is
committed.

## 3. State — nothing to lose

- The four plugins have no `${CLAUDE_PLUGIN_DATA}` references, no hooks, MCP/LSP servers, monitors,
  `bin/`, `userConfig` or `settings`.
- `~/.claude/plugins/data/` has no entry for them.
- Switching channels changes no external state (no credentials, daemons or hook side effects), and
  nothing is lost.

## 4. Return to latest

```text
[20:13:53] $ claude plugin disable sdd-engineering@dev-digest-ai-marketplace-stable --scope project        ✔
[20:13:54] $ claude plugin disable architecture-review@dev-digest-ai-marketplace-stable --scope project    ✔
[20:13:55] $ claude plugin disable research-tools@dev-digest-ai-marketplace-stable --scope project         ✔
[20:13:55] $ claude plugin disable engineering-paved-path@dev-digest-ai-marketplace-stable --scope project ✔
[20:13:56] $ claude plugin enable sdd-engineering@dev-digest-ai-marketplace --scope project
           ✔ Successfully enabled plugin: sdd-engineering (scope: project)
             (also enabled 3 dependencies: engineering-paved-path, research-tools, architecture-review)
[20:13:57] $ claude plugin list --json   (dev-digest entries)
  architecture-review@dev-digest-ai-marketplace            1.0.0-2349d7e28a33  enabled
  architecture-review@dev-digest-ai-marketplace-stable     1.0.0-2349d7e28a33  disabled
  engineering-paved-path@dev-digest-ai-marketplace         1.0.0-2349d7e28a33  enabled
  engineering-paved-path@dev-digest-ai-marketplace-stable  1.0.0-2349d7e28a33  disabled
  research-tools@dev-digest-ai-marketplace                 1.0.0-2349d7e28a33  enabled
  research-tools@dev-digest-ai-marketplace-stable          1.0.0-2349d7e28a33  disabled
  sdd-engineering@dev-digest-ai-marketplace                1.1.0               enabled
  sdd-engineering@dev-digest-ai-marketplace-stable         1.0.0               disabled
  `claude plugin list`: 0 dependency-error lines
[20:13:59] $ claude -p "Reply with the single word OK." --output-format stream-json --verbose --setting-sources project,local
  init sdd-engineering         ~/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.1.0
  init engineering-paved-path  ~/.claude/plugins/cache/dev-digest-ai-marketplace/engineering-paved-path/1.0.0-2349d7e28a33
  init research-tools          ~/.claude/plugins/cache/dev-digest-ai-marketplace/research-tools/1.0.0-2349d7e28a33
  init architecture-review     ~/.claude/plugins/cache/dev-digest-ai-marketplace/architecture-review/1.0.0-2349d7e28a33
  result success $0.13 "OK"
```

**Final `.claude/settings.json`:**

- Both marketplaces are in `extraKnownMarketplaces`. Stable has `"ref": "stable"`.
- The latest plugins are `true` in `enabledPlugins`, and the stable plugins are `false`. Stable is
  known and installed but disabled, so the next rollback skips `marketplace add` and `install`.

## Cost

| Step | Cost |
|---|---|
| `plugin eval` attempt (failed to load) | $0.00 |
| Smoke run 1 (invalidated) | $0.61 |
| Smoke run 2 | $0.54 |
| Init check after return | $0.13 |
| **Total** | **$1.28** |
