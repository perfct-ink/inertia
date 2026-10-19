---
priority: p0
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


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **Permissions and limits** per Space: which features the worker may change, a monthly usage cap, and who may assign work to it. Owners and managers set these. Ties to per-Space features (`choose-which-features-a-space-uses.md`). (Today: not present.)

## Added requirements

- Per Space: which features the worker may change, and who may assign work to it, set by owners and managers (in addition to the monthly cap and timeout above).

## Acceptance criteria
- A run over the cap fails with a clear message.
- Usage is visible to the Space.
