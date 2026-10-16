# Workflow retro ledger

| Date | Feature | Mode | Tokens: fresh in / cache read / out | Tool calls | Agents (order) | Duration: wall / active | Actions |
|---|---|---|---|---|---|---|---|
| 2026-10-16 | bookmark-tags | parent-only | 53k / 1.03M / 11k (main only; agent tokens missing) | 86 | implementer → architecture-reviewer → architecture-reviewer (re-review) → plan-verifier | 5m23s / agents busy 3m06s, parallelism 1.0 | 1. run-plan: launch architecture-reviewer + plan-verifier in one message; 2. collect findings from both before one fix round and one diff-only re-check; 3. run the next retro with `deep` |
