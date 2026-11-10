# Agent access (MCP server and REST for outside agents)

## What it does
An outside agent (Claude Code, Claude, or any program that speaks MCP or plain REST) can work inside one Space: list and read documents as Markdown, edit them, list/create/update tasks, and read/write Collection records. It gets in with an **agent token** that a Space owner makes. Everything it changes is recorded as made by the agent, never by a person.

- **MCP server.** `POST /mcp` takes JSON-RPC 2.0 (the "Streamable HTTP" transport answering with plain JSON: no session, no event stream; `GET /mcp` is `405`). Methods: `initialize`, `ping`, `tools/list`, `tools/call`; notifications get `202`; batches of up to 50 are answered one by one. Tool failures come back as results with `isError: true` and a readable message, not protocol errors.
- **REST.** `GET /api/v1/agent/tools` lists the tools the token may use; `POST /api/v1/agent/tools/:tool_name` runs one with a JSON object of arguments and answers `{ "result": ... }` (or `422 { "error": ... }`). It calls the same `AgentTools` code as MCP, so the two cannot drift apart. This is the shared part `public-api-and-webhooks` can build on.
- **Tokens.** `inertia_agent_` plus 256 random bits, sent as `Authorization: Bearer <token>` (header only, never URL or body).
- **Activity.** `GET /api/v1/agent_activities` lists what agents changed in the Space (newest 100): the action, a short summary and "Claude Code (agent)". A task's status history names the agent too (`changed_by_name: "Claude Code (agent)"`, `by_agent: true`).

Connecting Claude Code:

```sh
claude mcp add --transport http inertia https://<host>/mcp --header "Authorization: Bearer inertia_agent_..."
```

In development the MCP URL is the Rails port, for example `http://localhost:3847/mcp`.

## Tools
Read-only tokens see (and can call) only the first group.

| Tool | Does |
| --- | --- |
| `list_folders`, `list_documents` (`folder_id`, `query`), `read_document` | Folders and documents the token reaches; a document as Markdown plus `updated_at` and whether it can be rewritten |
| `list_tasks` (`document_id`, `status`, `query`), `read_collection` | Tasks; a Collection's fields and records (up to 500) |
| `edit_document` | Replaces a document's content with Markdown |
| `replace_text` | Swaps text inside a document without touching its structure (works for every document) |
| `create_task`, `update_task` | Title, description, status, start and due date |
| `write_collection_record` | Adds a record, or changes one when `record_id` is given; `null` clears a value |

### Documents as Markdown
Things Markdown has no place for ride along in HTML comments, and an edit keeps them (`DocumentMarkdown`):
- task lines: `- [ ] Write the spec <!-- task:12 -->` keeps the task id, so edits stay linked (see [document_task_lines.md](document_task_lines.md)). A ticked box marks that task done; a line without an id (or with the id of another document's task, which is never trusted) becomes a new task of this document; the title on the line renames its task. Reopening a task is `update_task`; removing a line does not delete the task.
- headings keep their anchor `<!-- id:... -->` (heading links point at it); styled paragraphs keep `<!-- style:quote -->`.
- tables, video, audio, file cards and anything the editor adds later are written as `<!-- keep:N type -->` and put back untouched when the comment is still there; deleting the comment deletes the block.
- a document with content Markdown would lose (for example highlight formatting) is marked `can_edit_document: false` and `edit_document` refuses it; `replace_text` still works.
- `edit_document` takes the `updated_at` from `read_document` as `base_updated_at` and refuses the edit if the document changed since. Without it the last write wins.
- A document is titled by its first heading, as in the editor.
- Links and images in new Markdown may only point at `http(s)://`, `mailto:`, `tel:`, a path (`/documents/3#intro`) or an anchor. Anything else (`javascript:`, `data:`, ...) is dropped, keeping the text, unless the document already had that exact address.

## Who can view and change (permission decisions)
**Decisions for Alex are marked.** Nothing in the existing access rules was loosened: the people's API still takes only signed-in people's tokens (an agent token gets `401` there), and `/mcp` and `/agent/tools` take only agent tokens.

- **Only Space owners create, list and revoke agent tokens** (`/api/v1/agent_tokens`). Admins and members get `403`; people outside the Space get `404`. *Decision:* owner-only, because a token is standing access to the Space's content for an outside program, like granting the owner role. Widening it to admins is a one-line change in `AgentTokensController#require_owner!`.
- **A token works only while the owner who made it is still an owner of the Space** (checked on every request). If that person is demoted or removed, their tokens stop working; they are not handed to someone else. *Decision:* conservative.
- **Scope.** A token belongs to one Space and optionally one folder (that folder and everything below it). Folder tokens never fall back to the whole Space: if the folder is deleted the token is deleted with it, and if the folder moves to another Space the token stops working. A document, task or Collection outside the scope looks exactly like one that does not exist (same error), so ids cannot be probed. A folder token cannot create a task outside its folder, and cannot change dates in a way that makes a flexible dependency folder move tasks outside its folder (the change is refused and rolled back).
- **Read-only or read-write.** A read-only token gets the read tools only; calling a write tool is refused.
- **What agents cannot do**: delete anything (documents, tasks, records, folders), change who is assigned, touch members, roles, shares or other Spaces, change a Collection's fields, write relation/file/formula fields, or read spreadsheets and uploaded files. *Decision:* conservative first cut.
- **Revoking** takes effect on the next request (every request looks the token up). The row stays so the activity it logged still names the agent. A Space can have at most 25 active tokens.
- **Seeing agent activity**: any member can read the list (like a task's status history).
- **Token handling.** Only a SHA-256 digest is stored (the token has 256 random bits, so a fast digest is enough). It is shown once, at creation, with `Cache-Control: no-store`; the list shows a short prefix and last use. It is read from the `Authorization` header only, so it never appears in a URL, a body or the request log; document text sent to the tools is filtered from request logs (`markdown`, `arguments`). When an MCP tool fails on a bug, the log names only the tool and the error class.
- **Attribution.** Each change writes an `agent_activities` row (action, subject, summary) in the same transaction as the change; task status changes are stored with the token instead of a person (`task_status_changes.agent_token_id`). Rows survive revoking the token and go away only when the token's Space or folder is deleted.

## API and models
- Tables `agent_tokens` (workspace, optional folder, creator, name, `token_digest`, `token_prefix`, `permission`, `revoked_at`, `last_used_at`), `agent_activities`, and `task_status_changes.agent_token_id`; models `AgentToken`, `AgentActivity`.
- `GET/POST /api/v1/agent_tokens`, `DELETE /api/v1/agent_tokens/:id` (revokes); `POST` answers once with `token` and `mcp_url`. `GET /api/v1/agent_activities` (filters `subject_type`, `subject_id`, `agent_token_id`).
- Code: `McpController`, `Api::V1::AgentToolsController`, the `AgentAuthenticated` concern, `AgentTools` (`app/services/agent_tools/documents.rb`, `tasks.rb`, `collections.rb`), `DocumentMarkdown`.
- Web: nginx proxies the exact path `/mcp` to Rails (`frontend/nginx/default.conf`); `/api/` already reaches the REST endpoints.

## Rate limits
Each token may make 120 tool calls a minute and 30 writes a minute (a write also counts as a call), in fixed one-minute windows (`AgentRateLimiter`, called from `AgentTools.call`). Over the limit, REST answers `429` with `Retry-After` (seconds to the next window) and MCP returns a tool error naming the wait; other tokens in the Space are unaffected and a refused call is not counted. `tools/list` and `GET /agent/tools` are not counted. **The counts are in each Rails process's memory** (production has no shared store; adding Redis was not done), so with several processes the effective limit is the figure times the process count and a restart resets it; this guards against a runaway loop, it is not a quota. `AgentRateLimiter.throttled?(token)` is there for the settings screen to mark a throttled token; that screen does not use it yet.

## Tests
Rate limits: `backend/test/services/agent_rate_limiter_test.rb`, and a case each in `agent_tools_controller_test.rb` and `mcp_controller_test.rb`.
`backend/test/models/agent_token_test.rb` (hashing, revocation, owner-only, scope, limits), `test/services/agent_tools_test.rb` (every tool, scoping, task-id trust, attribution, rollback), `test/services/document_markdown_test.rb` (round trips, unsafe links), `test/controllers/mcp_controller_test.rb`, `agent_tools_controller_test.rb`, `agent_tokens_controller_test.rb`, `agent_activities_controller_test.rb`. Shared setup in `test/support/agent_access.rb`.

## Known limits
- **Edits to a document someone has open can be lost.** The collab server keeps the open document in memory and writes it back on a debounce, so an agent edit made through Rails while a person has the document open is overwritten by their next save. `ai-worker-live-updates.md` covers sending agent edits through the collab server. Until then pass `base_updated_at`, and prefer `replace_text`.
- Spreadsheets and uploaded files are not exposed, and a Collection's fields are read-only for agents.
- No settings screen yet ([agent-token-settings-ui.md](../backlog/agent-token-settings-ui.md)); no OAuth, so Claude.ai connectors cannot sign in, only clients that can send a header such as Claude Code ([mcp-oauth-for-claude-ai.md](../backlog/mcp-oauth-for-claude-ai.md)); the rate limits are per process (see Rate limits).
- A document edit is limited to 300,000 characters of Markdown and 100 new task lines, a task title to 500 and its description to 20,000, a list to 200 rows.
- Markdown fidelity: nested lists and the basic marks round-trip; other inline content (mentions, highlight, ...) makes the document `can_edit_document: false`. Link URLs containing `)` are not supported.
- Permissions inside a Space are all-or-nothing today (every member sees every folder), so a folder token narrows access below what a member has.

## History
- Implemented 2026-11-09 on branch `backlog/ai-worker-agent-access`, not merged or deployed.
- Not verified (no database, gems or network where this was written): `rails test`, `rails db:migrate` and the schema diff, RuboCop, a real MCP client (Claude Code) against a running server, nginx. Ran: `ruby -c` on every Ruby file, and `DocumentMarkdown`'s tests under a stand-in Minitest harness.
- Not implemented: settings screen, OAuth, rate limits, live updates of open documents, deleting through agents.
