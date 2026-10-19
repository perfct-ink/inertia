---
priority: p0
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


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Working definition, pending Alex's confirmation: an **AI teammate** you assign work to the same way you assign a person. It reads the Space (documents, collections, tasks), does the task, and hands the result back for review. The writing-assistant features (`ai-summaries-and-task-generation.md`) and background triage come after it and reuse it.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **AI worker as an assignee**: it appears in the assignee picker and on boards like a member. Default: one AI worker per Space, shown with an AI badge. Done when a task can be assigned to it from the task row, board and document task line. (Today: not present.)

## Added requirements

- Show the worker in the assignee picker and on boards with an AI badge.
- Assign from the task row, the board and the document task line.

## Acceptance criteria
- Assigning a task to a worker queues a run when the rule is on.
- Unassigning stops further auto-runs.
