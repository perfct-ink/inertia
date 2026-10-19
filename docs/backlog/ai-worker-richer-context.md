---
priority: p2
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

## Acceptance criteria
- The prompt includes the extra context within a stated size cap.
- A test covers the cap.
