---
priority: p1
depends_on: [ai-worker-agent-access]
components: [frontend]
---
# Agent tokens: a settings screen for Space owners

## Objective
`ai-worker-agent-access` built the agent tokens and the activity log as API only (`/api/v1/agent_tokens`, `/api/v1/agent_activities`). A Space owner needs a screen to make, copy and revoke tokens without calling the API by hand.

## Requirements
- A "Agent access" section in the Space settings, shown to owners only (admins and members get nothing: the API refuses them).
- List the tokens: name, read-only or read-write, the folder it is limited to (or "Whole Space"), who made it, last used, and revoked ones greyed out.
- "New token": name, permission, optional folder (folder picker). On create show the token and the MCP URL **once** with copy buttons and a plain warning that it cannot be shown again; copy snippets for Claude Code (`claude mcp add --transport http inertia <url> --header "Authorization: Bearer <token>"`).
- Revoke with the shared confirm modal (no native dialogs); the row updates at once.
- An activity list per Space (and per token) from `/api/v1/agent_activities`, newest first, naming the agent, not a person. Also show the agent as the author where the task status history shows names (the API already sends `changed_by_name: "Claude Code (agent)"` and `by_agent: true`).
- Follows the design principles (375px, styled controls, light and dark, error on failed calls) and uses `@/components/ui`.

## Acceptance criteria
- An owner makes a token, copies it once, uses it against `/mcp`, then revokes it from the same screen and the agent gets 401 immediately.
- A non-owner does not see the section.
- Jest/RTL tests cover the screen; `docs/features/agent_access.md` is updated and this file is removed.
