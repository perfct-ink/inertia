---
priority: p0
depends_on: [ai-worker-agent-access]
branch: backlog/ai-worker-send-docs-to-agent
components: [frontend, backend]
---
# AI worker: send docs to Claude or an agent and start the work

## Objective
From a document, folder or task, press **Send to agent**, pick where it goes, and the agent starts working on it (Alex, 2026-10-19).

## Requirements
- A "Send to agent" action on documents, folders (for example a project or feature folder with its PRDs) and tasks.
- Destinations, each set up once per Space:
  - **Claude, run by Inertia**: the server starts an agent run through the Anthropic API with Inertia's MCP tools attached, using the existing `ai_workers` / `ai_runs` records and the adapter in `ai-worker-anthropic-adapter.md`.
  - **Claude Code or another agent**: Inertia hands over a prompt plus the MCP URL and a scoped token (copyable, or delivered by webhook) so the agent works from its own environment, such as a repo.
- The handoff includes the selected docs, their open tasks and an optional instruction ("build this", "draft the release plan").
- Each handoff is recorded as a run on the items it covers: who sent it, to which agent, when, and its status.

## Acceptance criteria
- A person can send a PRD to Claude and see a run start on it without leaving the app.
- A person can copy a handoff for Claude Code, paste it, and the agent can read the same docs through MCP.
- Failed API calls show an error.
- Tests cover the handoff; `docs/features/ai_workers.md` is updated and this file is removed.

## Blocked
Built on `backlog/ai-worker-send-docs-to-agent`, stacked on `backlog/ai-worker-agent-access` (merge that first): the Claude Code / other-agent destination with a copyable prompt, MCP URL and folder-scoped token, on documents, folders and tasks, with a handoff record and status.
Not built: "Claude, run by Inertia" (needs `ai-worker-anthropic-adapter`, which needs the `anthropic` gem, `ANTHROPIC_API_KEY` and network) and webhook delivery. Leave this file in place until those exist.
Not run (no gems, DB or node_modules offline): `rails test`, `rails db:migrate` (diff `db/schema.rb`), `npm run lint`, type-check, Jest.
