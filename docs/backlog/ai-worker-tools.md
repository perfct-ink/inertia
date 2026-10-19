---
priority: p3
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

## Acceptance criteria
- A worker can never write without an approval step.
- Every call appears in the audit log.
