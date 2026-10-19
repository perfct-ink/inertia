---
priority: p2
depends_on: [ai-worker-anthropic-adapter]
components: [backend]
---
# AI worker: limits and cost

## Objective
Runs cost real money and can be long.

## Requirements
- Per-Space monthly run or token cap, a per-run timeout, and a visible usage total.
- Decide how long stored output is kept.
- Tell users where workers are shown that task text is sent to Anthropic.

## Acceptance criteria
- A run over the cap fails with a clear message.
- Usage is visible to the Space.
