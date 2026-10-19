---
priority: p0
depends_on: [ai-worker-run-ui]
components: [frontend, backend]
---
# AI worker: accept a result

## Objective
Turn a run's output into data with one click and an undo, keeping a person in the loop.

## Requirements
- Accept as the task description, as a new document, or as sub-tasks.
- Undo after accepting.
- Record who accepted which run.


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **Review before it lands**: the worker's changes arrive as a proposal (suggested edits or a draft) that a person accepts or rejects. Pairs with comments (`comments-on-items.md`). Nothing the worker does is final until someone accepts it. (Today: not present.)

## Added requirements

- Changes arrive as a proposal (suggested edits or a draft) that a person accepts or rejects.

## Acceptance criteria
- Nothing from a worker changes a task or document until a person accepts it.
- Undo restores the prior state.
