---
priority: p1
depends_on: []
components: [backend]
branch: backlog/ai-worker-agent-access
status: incomplete
---
# AI worker: let Claude and other agents read and edit a Space

## Objective
Alex, 2026-10-19: "The AI worker is the ability to push inertia's docs to Claude or an Agent and get it started on the work. I want the app to update when the docs update."

An outside agent (Claude, Claude Code, or any agent that speaks MCP or REST) needs a way into a Space: read its documents, tasks and collections, and write back changes. This is the base the other `ai-worker-*` tasks build on.

## Requirements
- An **MCP server** for Inertia (remote, HTTP) with tools to list and read documents (as Markdown), edit a document, list/create/update tasks, and read/write collection records. Agents like Claude Code and Claude.ai connect to it directly.
- The same operations on the REST API for agents that don't use MCP (overlaps `public-api-and-webhooks.md`; build the shared part once).
- **Agent tokens**: a Space owner creates a token for an agent, scoped to one Space (optionally one folder) and to read-only or read-write. Tokens can be revoked. Every change made with a token is recorded as made by that agent, not by a person.
- Documents go out as Markdown and come back as Markdown (or as structured edits), with task lines keeping their task IDs so edits stay linked (see `docs/features/document_task_lines.md`).

## Acceptance criteria
- Claude Code, given the MCP server URL and a token, can read a document, tick a task and edit a paragraph in one Space, and can't reach any other Space.
- A revoked token stops working immediately.
- Each change shows the agent as its author.
- Tests cover token scoping and the read/write tools; `docs/features/` and `docs/services.md` are updated and this file is removed.

## Unverified
Built on this branch (2026-11-09): agent tokens (hashed, shown once, owner-only, scoped to a Space or folder, read-only or read-write, revocable at once), the MCP server (`POST /mcp`), the same tools on REST (`/api/v1/agent/tools`), the Markdown conversion for documents, the agent activity log, and agent attribution on task status history. Docs: `docs/features/agent_access.md`, its README row, `docs/services.md`, `docs/deployment.md`. The nginx location for `/mcp` is in `frontend/nginx/default.conf`. Permission decisions for Alex are listed in the feature doc (owner-only creation, a token dies with its creator's owner role, agents cannot delete). Follow-ups: `agent-token-settings-ui`, `mcp-oauth-for-claude-ai`, `agent-access-rate-limits`; live updates of open documents stay in `ai-worker-live-updates`.

Why this file stays: nothing could run the Rails app here (no database, gems or network), and there is no settings screen yet (the spec's "a Space owner creates a token" works through the API only until `agent-token-settings-ui` ships).

Ran: `ruby -c` on every Ruby file; `DocumentMarkdown`'s tests (17, passing) under a stand-in Minitest harness; `/tmp/runner/all.sh` static checks. Not run: everything else below.

To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect no diff (migrations 20261108160001, 20261108160002)
cd backend && rails test    # new: test/models/agent_token_test.rb, test/services/agent_tools_test.rb,
                            # test/services/document_markdown_test.rb, test/controllers/{mcp,agent_tools,agent_tokens,agent_activities}_controller_test.rb
cd backend && bundle exec rubocop
```

Then by hand against a dev server (`make up`): make a token as a Space owner with `curl -X POST -H "Authorization: Bearer <jwt>" -H "X-Workspace-Id: <id>" -H "Content-Type: application/json" -d '{"name":"Claude Code","permission":"write"}' http://localhost:3847/api/v1/agent_tokens`, then `claude mcp add --transport http inertia http://localhost:3847/mcp --header "Authorization: Bearer <token>"`. In Claude Code read a document, tick a task and edit a paragraph; check another Space's ids are refused; revoke with `DELETE /api/v1/agent_tokens/:id` and confirm the next call is a 401. For production, after the nginx change deploys, check that `curl -i https://<host>/mcp` returns 401 (not the SPA's index.html).
