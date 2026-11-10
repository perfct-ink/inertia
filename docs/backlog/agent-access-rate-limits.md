---
priority: p2
depends_on: [ai-worker-agent-access]
components: [backend]
branch: backlog/agent-access-rate-limits
status: incomplete
---
# Agent access: rate limits

## Objective
An agent token can call `/mcp` and `/api/v1/agent/tools/*` as fast as it likes. A runaway agent (or a leaked token before it is revoked) could hammer the database or write thousands of tasks.

## Why this is not built
There is no throttling layer in the app (no `rack-attack`, no Redis in production; see `docs/services.md`). Adding a gem or a store is new infrastructure, so it needs Alex's go-ahead. `ai-worker-agent-access` limits what it can without one: 25 active tokens per Space, 300,000 characters per Markdown edit, 200 rows per list, 500 Collection records per read, and `last_used_at` for owners to spot a busy token.

## Requirements
- A per-token request limit (for example 120 requests a minute) and a per-token write limit, answered with `429` and `Retry-After` on REST and as a tool error on MCP.
- Prefer a store that already exists in production (the database or in-process memory) over adding Redis; say so in the feature doc if it is per process only.
- Show a throttled token on the settings screen (`agent-token-settings-ui.md`).

## Acceptance criteria
- A test that makes more requests than the limit sees `429`, and a second token in the same Space is unaffected.
- `docs/features/agent_access.md` and `docs/services.md` are updated and this file is removed.

## Unverified

Built without Rails: run `rails test test/services/agent_rate_limiter_test.rb test/controllers/agent_tools_controller_test.rb test/controllers/mcp_controller_test.rb`. In-process counters, as the task preferred over adding Redis (documented in `agent_access.md`). Left: showing a throttled token on the settings screen (`AgentRateLimiter.throttled?`, once `agent-token-settings-ui` merges), and Alex's call on the figures (120 calls and 30 writes a minute). Delete this file when the tests pass and the figures are accepted.
