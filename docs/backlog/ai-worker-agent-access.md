---
priority: p0
depends_on: []
components: [backend]
---
# AI worker: let Claude and other agents read and edit a Space

## Objective
Alex, 2026-10-19: "The AI worker is the ability to push inertia's docs to Claude or an Agent and get it started on the work. I want the app to update when the docs update."

An outside agent (Claude, Claude Code, or any agent that speaks MCP or REST) needs a way into a Space: read its documents, tasks and collections, and write back changes. This is the base the other `ai-worker-*` tasks build on.

## Requirements
- An **MCP server** for Inertia (remote, HTTP) with tools to list and read documents (as Markdown), edit a document, list/create/update tasks, and read/write collection records. Agents like Claude Code and Claude.ai connect to it directly.
- The same operations on the REST API for agents that don't use MCP (overlaps `public-api-and-webhooks.md`; build the shared part once).
- **Agent tokens**: a Space owner creates a token for an agent, scoped to one Space (optionally one folder) and to read-only or read-write. Tokens can be revoked. Every change made with a token is recorded as made by that agent, not by a person.
- Documents go out as Markdown and come back as Markdown (or as structured edits), with task lines keeping their task IDs so edits stay linked (see `task-line-two-way-sync.md`).

## Acceptance criteria
- Claude Code, given the MCP server URL and a token, can read a document, tick a task and edit a paragraph in one Space, and can't reach any other Space.
- A revoked token stops working immediately.
- Each change shows the agent as its author.
- Tests cover token scoping and the read/write tools; `docs/features/` and `docs/services.md` are updated and this file is removed.
