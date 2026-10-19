---
priority: p0
depends_on: [ai-worker-anthropic-adapter, notifications-inbox, ongoing-tasks-with-check-ins]
components: [backend, frontend]
---
# AI worker: progress updates and questions

## Objective
The worker posts status updates and asks questions on the task, and the assignee is notified.

## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **Progress and questions**: the worker posts status updates and asks questions on the task, and the assignee is notified. Needs the notifications inbox (`notifications-inbox.md`). Uses the same check-in mechanism as ongoing tasks (`ongoing-tasks-with-check-ins.md`). (Today: not present.)

## Requirements
- Updates and questions are saved on the task, so its history reads like a log.
- The assignee is notified through the notifications inbox.
- Reuse the check-in mechanism from ongoing tasks rather than building a second one.

## Acceptance criteria
- A run can post a status update and a question on its task.
- The assignee gets a notification for each.
- Failed API calls show an error.
- Tests cover the behaviour; `docs/features/ai_workers.md` is updated and this file is removed.
