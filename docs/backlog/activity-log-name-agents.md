---
priority: p3
depends_on: [activity-log-per-item, ai-worker-agent-access]
components: [backend, frontend]
---
# Activity log: show the agent that made a change

## Objective

When an outside agent changes an item through the MCP server or the agent REST API (`ai-worker-agent-access`), the item's activity log (`docs/features/activity_log.md`) names the agent, for example "Claude Code (agent)", instead of "Someone".

## Current state

`Activity` rows take their actor from `Current.user`, which `ApplicationController` sets from the signed-in person. The agent endpoints authenticate with an agent token, so no user is set and every change an agent makes is logged with no actor. Agent access keeps its own list of what agents changed (`agent_activities`, `AgentActivity`, `GET /api/v1/agent_activities`, `docs/features/agent_access.md`); the two tables are separate and share no names.

## Requirements

- Record which agent token made a change on the `activities` row (a nullable `agent_token_id`, or a name kept with the entry so it survives revoking), set from a `Current.agent_token` that the agent endpoints fill in.
- Show the agent as the author in the dialog; never put a person's name on an agent's change.
- Decide whether the item log should also list agent-only actions that do not save the item (reads), and leave those out unless there is a reason.

## Acceptance criteria

- A task or document changed with an agent token shows the agent's name in its log.
- Tests cover the attribution; `activity_log.md` and `agent_access.md` are updated and this file is removed.
