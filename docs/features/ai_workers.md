# AI workers

## What it does
The data model and background job for handing a task to a named AI worker and storing its reply. **No model is connected yet**: every run fails with "No AI client is configured". There is no UI.

A worker has a name, instructions (its system prompt), a model (default `claude-opus-5-5`) and an enabled flag. A run is one attempt at one task: status `queued`, `running`, `succeeded` or `failed`, plus `output`, `error` and timestamps. A run only stores text; it cannot change tasks or documents.

Rules: the worker must be enabled; worker and task must belong to the same Space; a task cannot have two active (queued or running) runs from the same worker.

## API and models
- Tables `ai_workers`, `ai_runs`; models `AiWorker`, `AiRun`.
- `GET/POST /api/v1/ai_workers`, `PATCH/DELETE /api/v1/ai_workers/:id`.
- `GET /api/v1/ai_runs` (optional `task_id`, newest 100), `POST /api/v1/ai_runs` (queues `AiWorkerRunJob`).
- `AiWorkers::Runner` runs a queued run and records a client error on it instead of raising. `AiWorkers::Prompt` builds the prompt: the worker's instructions plus fixed rules as the system prompt, the task's title, status, due date and description in the user turn. The model call goes through `AiWorkers.client`, which is unset by default.

## Agent access (MCP and REST)
Outside agents (Claude, Claude Code, any MCP or REST client) reach a Space with an **agent token**.
- Owners and admins make tokens from the Space switcher, **Agent access**: a name, read-only or read and write, and optionally one folder. The token (`inertia_agent_...`) is shown once with the MCP URL and a `claude mcp add` command; only its SHA256 digest and a short prefix are stored. Revoking stops it at once.
- `POST /mcp` is a JSON-RPC 2.0 MCP server (`initialize`, `ping`, `tools/list`, `tools/call`, batches). The same tools are on REST: `GET /api/v1/agent/tools`, `POST /api/v1/agent/tools/:name`. Tokens are managed at `GET/POST /api/v1/agent_tokens`, `DELETE /api/v1/agent_tokens/:id`.
- Tools (`AgentTools`): `list_documents`, `read_document` (Markdown), `edit_document`, `replace_text`, `list_tasks`, `create_task`, `update_task`, `read_collection`, `write_collection_record`. Read-only tokens don't see the write tools. A token only reaches its own Space (and folder, if limited).
- `DocumentMarkdown` converts between the editor's JSON and Markdown. Task lines end with `<!-- task:ID -->` so edits stay linked to their tasks; new checklist lines create tasks. Documents with tables or video are refused by `edit_document` (use `replace_text`).
- Each write is recorded in `agent_activities` against the token. Showing the agent as author in the UI is not done.
- nginx must proxy `/mcp` to Rails. Edits go through Rails, not the collab server, so an open editor can overwrite them until `ai-worker-live-updates` is built.
- Tests: `test/models/agent_token_test.rb`, `test/services/agent_tools_test.rb`, `test/services/document_markdown_test.rb`, `test/controllers/mcp_controller_test.rb`, `test/controllers/agent_tokens_controller_test.rb`; frontend `AgentAccess.test.tsx`, `data/agentAccess.test.ts`.

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Configuration
`ANTHROPIC_API_KEY` is documented in `docs/services.md` but not read yet. Jobs use the in-process queue, so queued runs are lost on restart.

## Tests
`backend/test/models/ai_run_test.rb`, `test/services/ai_workers_runner_test.rb` (fake client), `test/controllers/ai_runs_controller_test.rb`.

## Known limits
The foundation supports multiple named workers per Space. The product spec (Alex, 2026-10-19) defaults to one AI worker per Space shown as an assignee with an AI badge; which to follow is pending Alex's confirmation (see `docs/backlog/ai-worker-assign-and-auto-run.md`). Alex clarified on 2026-10-19 that the AI worker means sending Inertia's docs to Claude or another agent to do the work, with the app updating live as the agent edits; see `docs/backlog/ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`.

No model adapter, no UI, no cost limits, no retry or cancel, and runs stuck in `running` after a restart are not cleaned up. Task text would be sent to Anthropic once connected.

## History
- Implemented 2026-10-18 (foundation only). Committed locally; not pushed or deployed.
- Not verified: the tests were not run (no gems installed), the migration was not run, and no real model call was made.
- Agent access implemented 2026-10-19 on branch `backlog/ai-worker-agent-access`; not merged or deployed. Not verified: Rails tests, migration, Jest, lint, type-check (no gems, DB or node_modules offline); Markdown conversion was checked with a plain Ruby script.
