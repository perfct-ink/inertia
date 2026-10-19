---
priority: p2
depends_on: [ai-worker-run-ui]
components: [backend, frontend]
---
# AI worker: assign tasks to a worker

## Objective
Treat an AI worker as an assignee, optionally running when a task enters a status.

## Requirements
- Add `ai_worker_id` on tasks (not a fake user); show it like an assignee.
- Optional rule: auto-run when a task enters a chosen status.
- Respect the one-active-run rule.

## Acceptance criteria
- Assigning a task to a worker queues a run when the rule is on.
- Unassigning stops further auto-runs.
