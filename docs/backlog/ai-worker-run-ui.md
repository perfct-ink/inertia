---
priority: p1
depends_on: [ai-worker-anthropic-adapter]
components: [frontend]
---
# AI worker: run UI

## Objective
Let a person create workers, run one on a task and read the result.

## Requirements
- A Workers settings page: create, edit instructions and model, enable or disable, delete.
- A worker picker and run button on a task, and a run history with status, output (copyable) and error.
- Poll or refetch while a run is queued or running; show API errors.
- Tasks have no detail view; start from the task row or Kanban card. Use shared `@/components/ui` controls.

## Acceptance criteria
- A user can create a worker, run it on a task and see the output without leaving the app.
- A duplicate run shows the server's error.
