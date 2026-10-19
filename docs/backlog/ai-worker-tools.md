---
priority: p0
depends_on: [ai-worker-accept-result]
components: [backend]
---
# AI worker: tools with approval

## Objective
Let a worker read the Space and propose edits (create sub-tasks, set dates) through a narrow tool set.

## Requirements
- Define read-only tools first, then proposal tools that need approval.
- Audit log of every tool call.
- Use the tool runner or a manual loop per the Claude API guidance.


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **Worker runs the task**: reads the task, its document and linked items, and produces the result (edits a document, fills a collection, creates subtasks, writes a summary). Runs as a background job. Every change it makes is attributed to it and can be undone. It can only touch the Space it belongs to. (Today: not present; the foundation runs text-only in a background job.) This file covers the changes it makes; reading more context is `ai-worker-richer-context.md`.

## Added requirements

- Every change the worker makes is attributed to it and can be undone.
- It can only touch the Space it belongs to.

## Acceptance criteria
- A worker can never write without an approval step.
- Every call appears in the audit log.
