---
priority: p2
depends_on: [ai-worker-anthropic-adapter]
components: [backend, frontend]
---
# AI worker: retry, cancel and stuck runs

## Objective
The in-process queue drops jobs on restart, leaving runs stuck.

## Requirements
- Retry a failed run and cancel a queued or running one.
- On boot, mark runs left in `running` as failed.

## Acceptance criteria
- A run is never stuck forever after a restart.
- Cancel stops a queued run from starting.
