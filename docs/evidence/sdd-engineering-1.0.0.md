# Evidence — sdd-engineering 1.0.0 in bookmarks-api

The `bookmark-tags` feature was built with `sdd-engineering@dev-digest-ai-marketplace` 1.0.0,
installed from the marketplace at project scope (see `.claude/settings.json`). The project has no
`.claude/agents`, `.claude/skills` or `.claude/commands` of its own, so every agent and skill below
comes from the plugins.

Every stage was a fresh headless session on Claude Code 2.1.301, run like this:

```bash
claude -p "<prompt>" --session-id <uuid> --output-format stream-json --verbose \
  --setting-sources project,local --permission-mode acceptEdits \
  --allowedTools <stage list> --max-budget-usd <cap> < /dev/null > <stream>.jsonl
```

- `--setting-sources project,local` leaves out user-level plugins and hooks.
- Stage c had a Bash allowlist (`git status/diff/log/add/commit/…`, `npm test*`,
  `npm run typecheck*`, `node --test*`) and `git push` disallowed.
- Streams are kept outside the repo. The excerpts below show only relative paths.

## 1. Plugins loaded (`system/init` of stage a)

```text
model claude-opus-5-5 · claude_code_version 2.1.301
sdd-engineering         ~/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.0.0
engineering-paved-path  ~/.claude/plugins/cache/dev-digest-ai-marketplace/engineering-paved-path/1.0.0-2349d7e28a33
research-tools          ~/.claude/plugins/cache/dev-digest-ai-marketplace/research-tools/1.0.0-2349d7e28a33
architecture-review     ~/.claude/plugins/cache/dev-digest-ai-marketplace/architecture-review/1.0.0-2349d7e28a33
```

- The dependencies were installed by the installer itself. Their `^1.0.0` constraints resolved to
  the `1.0.0` release tags, at commit `2349d7e` (the `-2349d7e28a33` suffix).
- `init.agents` lists: `architecture-review:architecture-reviewer`, `research-tools:researcher`,
  `sdd-engineering:implementation-planner`, `sdd-engineering:implementer`,
  `sdd-engineering:plan-verifier`, `sdd-engineering:spec-creator`.
- `init.skills` lists: `sdd-engineering:{engineering-insights,run-plan,workflow-retro}` and
  `engineering-paved-path:{drizzle-orm-patterns,fastify-best-practices,postgresql-table-design,react-best-practices,react-testing-library,zod}`.

## 2. Agents and skills used

| Stage | Call (from the stream) |
|---|---|
| a | `main → Agent sdd-engineering:spec-creator` → reads `CONVENTIONS.md`, `src/**`, `test/**` → `Write specs/bookmark-tags/spec.md` |
| b (natural phrasing) | No agent. The main session read the files with `cat` and wrote `plan.md` itself (see checklist) |
| b (explicit) | `main → Agent sdd-engineering:implementation-planner` → reads `CONVENTIONS.md`, the spec, `package.json`, `src/**`, `tsconfig.json` |
| c | `/sdd-engineering:run-plan specs/bookmark-tags/spec.md specs/bookmark-tags/plan.md` (typed by the user; the slash command expands the skill, so the stream has no `Skill` tool call) → `Agent sdd-engineering:implementer` → `Agent architecture-review:architecture-reviewer` → re-review of the fix → `Agent sdd-engineering:plan-verifier` → reads `skills/run-plan/report-template.md` |
| c, inside implementer | `Skill engineering-paved-path:zod`, `Skill engineering-paved-path:fastify-best-practices` |
| d | `/sdd-engineering:workflow-retro` (typed by the user) → `node …/sdd-engineering/1.0.0/skills/workflow-retro/scripts/collect.mjs` |

## 3. Lab checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Spec in the documented path | **yes** | `Write specs/bookmark-tags/spec.md`, which is `specs/<feature>/spec.md` from CLAUDE.md:5 and CONVENTIONS §2. No code paths in the spec (`grep 'src/\|\.ts'` is empty) |
| 2 | Plan made from this spec | **partly** | With the natural phrasing "Plan the implementation of specs/bookmark-tags/spec.md …", the main session wrote a plan itself and never dispatched the planner. That plan had no Traceability table and no AC/Test/Verify per task, so it was discarded. With "Use sdd-engineering:implementation-planner on …", the planner produced `plan.md`: `Spec: specs/bookmark-tags/spec.md (SPEC-01)`, 6 tasks, Traceability with 30/30 AC. Check commands are cited from `package.json:9` (`test`) and `package.json:10` (`typecheck`) |
| 3 | run-plan started the implementer | **yes** | `main → Agent sdd-engineering:implementer` with tasks T-1..T-6; implementer ran `npm test` / `npm run typecheck` after its steps |
| 4 | researcher available | **yes** (not invoked) | `research-tools:researcher` in `init.agents` |
| 5 | architecture-reviewer read the CLAUDE.md rules | **yes** | Reviewer report: "The rules I judged against: … routes never import from `src/store` (`CLAUDE.md:3`) · Zod schemas live only in `src/routes` (`CLAUDE.md:4`)", then `Verdict: PASS (0 CRITICAL, 1 WARNING, 0 SUGGESTION). Judged against … CLAUDE.md`. It found the file with `Glob **/{ARCHITECTURE,AGENTS,CLAUDE}.md` and quoted lines 3–4 without a `Read` call. *Inferred:* the content reached it as project memory loaded into the subagent |
| 6 | plan-verifier checked the AC | **yes** | Matrix with 30 `AC-n` rows: 30 PASS, 0 PARTIAL, 0 MISSING. AC-26 is marked as needing a runtime check, and the main session ran its test (pass) |
| 7 | workflow-retro only by hand | **yes** | Not invoked in streams a, b or c. Invoked only in d, by the user's `/sdd-engineering:workflow-retro session=<c> feature=bookmark-tags` (`disable-model-invocation: true`) |
| 8 | workflow-retro scripts ran through `${CLAUDE_SKILL_DIR}` | **yes** | Command: `node ~/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.0.0/skills/workflow-retro/scripts/collect.mjs --list`, then `--session <c>`. The variable was substituted with the installed skill directory |
| 9 | Plugin did not override the project's instructions | **yes** | Spec and plan in `specs/bookmark-tags/` (CLAUDE.md:5). Checks are `npm test` and `npm run typecheck` (CLAUDE.md:6, `package.json`). Zod stays in `src/routes`, and routes do not import `src/store` (reviewer, CLAUDE.md:3-4). `package.json` and its exact versions are unchanged |

**Other findings (no plugin change in this step):**

- **b — routing.** `implementation-planner` is not picked up by a natural "plan the implementation"
  request. The main session plans inline instead. The plugin README's quick start names the agent
  explicitly, which worked. Possible fix: a more directive agent `description`, plus an eval case
  with natural phrasing.
- **a — open questions.** `spec-creator` left 10 open questions, each with a proposed default, as
  `[NEEDS CLARIFICATION]`. The user accepted all defaults, recorded them as decisions and set
  `Status: approved` (commit `docs(specs): … approved with the proposed defaults`).
- **b — absolute paths.** The planner wrote the absolute repo path into its `Verify` lines. It was
  replaced with "the repo root" before commit.
- **c — commit trailers.** The headless main session added `Co-Authored-By: Claude …` trailers to
  the two implementation commits. This is Claude Code's default commit attribution, not the plugin.
  The trailers were removed before push (messages only, same tree).
- **c — open WARNING.** One architecture WARNING is still open after the second review: the route's
  distinct-tag-count check repeats the service's lower-case + de-duplicate rule. `run-plan` stopped
  after one fix round and left the decision to the user, as designed. Both proposed fixes would
  change AC-14 or AC-17, so the duplication is accepted for now.

## 4. Cost and duration per stage

Costs are `total_cost_usd` from each stream's `result` record. Wall-clock is the span of the
session logs, subagents included.

| Stage | Cost | Wall-clock | Models |
|---|---|---|---|
| probe (plugin load check, "reply OK") | $0.13 | — | opus-5-5 |
| a — spec | $0.70 | 111 s | opus-5-5 (+ haiku for background tasks) |
| b — plan, natural phrasing (discarded) | $0.47 | 71 s | opus-5-5 |
| b — plan via implementation-planner | $0.92 | 184 s | opus-5-5 |
| c — run-plan (implementer, reviewer ×2, verifier) | $1.62 | 325 s | opus-5-5 main + verifier; sonnet-5-5 implementer + reviewer |
| d — workflow-retro (parent-only) | $0.45 | 38 s | opus-5-5 |
| **Total** | **$4.29** | | |

`workflow-retro` was run without `deep`, so its token totals cover only the main thread. It says
this itself. The four subagent logs were not read. Its row is in `docs/retros/ledger.md`.

## 5. Result

`feat/bookmark-tags`: `npm test` passes 39/39 and `npm run typecheck` passes. The verification
report is `specs/bookmark-tags/verification.md`.
