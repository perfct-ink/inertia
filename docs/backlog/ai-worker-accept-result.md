---
priority: p1
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

## Acceptance criteria
- Nothing from a worker changes a task or document until a person accepts it.
- Undo restores the prior state.
