---
priority: p0
depends_on: [ai-worker-anthropic-adapter]
components: [backend]
---
# AI worker: richer task context

## Objective
Include more than title, status, due date and description in the prompt (`AiWorkers::Prompt`).

## Requirements
- Add the task's epic, parent and sub-tasks, and its linked document's text.
- Cap prompt size and say what was left out.
- Keep task text inside the fenced `<task>` block.


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **Worker runs the task**: reads the task, its document and linked items, and produces the result. Runs as a background job. It can only touch the Space it belongs to. (Reading part of the row; the changes it makes are `ai-worker-tools.md`.)

## Added requirements

- The worker reads the task, its document and linked items.

## Acceptance criteria
- The prompt includes the extra context within a stated size cap.
- A test covers the cap.
