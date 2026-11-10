---
priority: p1
depends_on: [ai-worker-run-ui]
components: [backend, frontend]
---
# AI worker: assign tasks to a worker

## Objective
Treat an AI worker as an assignee, optionally running when a task enters a status.

## Requirements
- Add `ai_worker_id` on tasks (not a fake user); show it like an assignee.
- Optional rule, off by default (Alex, 2026-11-10): a per-worker setting that auto-runs when a task enters a chosen status. Assigning a task alone never runs anything.
- Respect the one-active-run rule.


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Alex chose multiple named workers per Space on 2026-11-10.

Original row: **AI worker as an assignee**: it appears in the assignee picker and on boards like a member. Default: one AI worker per Space, shown with an AI badge. Done when a task can be assigned to it from the task row, board and document task line. (Today: not present.)

## Added requirements

- Show the worker in the assignee picker and on boards with an AI badge.
- Assign from the task row, the board and the document task line.

## Acceptance criteria
- Assigning a task to a worker queues a run only when the worker's rule is on and the task is in its chosen status; with the rule off, assigning runs nothing.
- Unassigning stops further auto-runs.
