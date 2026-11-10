# AI workers

## What it does
The data model and background job for handing a task to a named AI worker and storing its reply. With `ANTHROPIC_API_KEY` set, a queued run calls Anthropic's Claude API and ends `succeeded` with the reply; with no key it fails with "No AI client is configured". There is no UI.

**Privacy: once the key is set, the task's title, status, due date and description, and the worker's instructions, are sent to Anthropic** whenever a worker runs. Nothing else from the Space is sent. Say so wherever workers are shown to users.

A worker has a name, instructions (its system prompt), a model (default `claude-opus-5-5`) and an enabled flag. A run is one attempt at one task: status `queued`, `running`, `succeeded` or `failed`, plus `output`, `error`, `input_tokens`, `output_tokens` and timestamps. A run only stores text; it cannot change tasks or documents.

Rules: the worker must be enabled; worker and task must belong to the same Space; a task cannot have two active (queued or running) runs from the same worker.

## API and models
- Tables `ai_workers`, `ai_runs`; models `AiWorker`, `AiRun`.
- `GET/POST /api/v1/ai_workers`, `PATCH/DELETE /api/v1/ai_workers/:id`.
- `GET /api/v1/ai_runs` (optional `task_id`, newest 100), `POST /api/v1/ai_runs` (queues `AiWorkerRunJob`).
- `AiWorkers::Runner` runs a queued run and records a client error on it instead of raising. `AiWorkers::Prompt` builds the prompt: the worker's instructions plus fixed rules as the system prompt, the task's title, status, due date and description in the user turn. The model call goes through `AiWorkers.client`, any object with `complete(model:, system:, prompt:)` that returns the reply text or an `AiWorkers::Reply` (text plus token counts). It is the unconfigured client unless the initializer installs the Anthropic one.
- `AiWorkers::AnthropicClient` (`app/services/ai_workers/`) posts to the Messages API with `stream: true` so long replies are not cut off, and folds the server-sent events into the reply (`SseParser`, `MessageStream`). The default model is `claude-opus-5-5`, used when a worker has none. Only `text` blocks make up the reply; thinking blocks are dropped. A reply that hit the length limit gets a one-line notice appended.
- `AiWorkers::HttpTransport` is the only code that does HTTP (plain `Net::HTTP`, 10 s connect, 120 s of silence, 600 s total). Tests swap it for a stub, so they never reach the network.
- Failures become failed runs with a readable `error` (`AiWorkers::ProviderError`): a refusal ("The model declined this request"), a rate limit or overload ("Try again in a few minutes"), a bad or unauthorised key (tells an admin to check `ANTHROPIC_API_KEY`), a billing problem, an oversized task, a timeout, a dropped connection, a stream that ends early or returns no text, and any other API error with Anthropic's own message (truncated). The key and the request body never appear in an error, the log, `inspect` or an API response.
- `config/initializers/ai_workers.rb` is the only place `ANTHROPIC_API_KEY` is read. It installs the Anthropic client only when the key is non-empty (and not in the test environment, where tests set `AiWorkers.client` themselves).
- Usage: the token counts a call reports (cached input included) are stored on the run, also for a run that failed after reaching the model (a refusal still costs tokens). `AiRun.token_usage` sums a scope: `workspace.ai_runs.token_usage` is a Space's total, and `workspace.ai_runs.where(created_at: ...)` narrows it. `AiRunBlueprint` includes both counts. The cap that uses this is `ai-worker-limits-and-cost.md`.

## Send to agent (Claude Code or another MCP agent)
A **Send to agent** button (bot icon) sits in the document toolbar, the folder header and on each task card, for Space owners. It asks for an agent name, an instruction and read-only or read-and-write, then shows a handoff to copy once: a prompt (what to read, the open tasks or folder documents, the instruction) plus the `claude mcp add` command with a new agent token limited to the folder the item is in, or the whole Space for a task outside any folder (see [agent_access.md](agent_access.md)). The prompt never contains the token, and the token is shown only once.
- `POST /api/v1/agent_handoffs` (`subject_type` document, folder or task; `subject_id`, `agent_name`, `instruction`, `permission`) and `GET /api/v1/agent_handoffs?subject_type=&subject_id=`. Owners only: sending makes an agent token, and only owners make tokens (403 for members and viewers; the button is hidden for them).
- Model `AgentHandoff` (who sent it, what it covers, instruction, prompt, token; migration `20261110110001`). Its status follows the token: **sent** until the agent first uses it, **working** after, **closed** once revoked. The dialog lists earlier handoffs for the item.
- Code: `AgentHandoffsController`, `AgentHandoffPrompt`, `frontend/src/components/workspace/SendToAgent.tsx`, `api/agentHandoffs.ts`, `data/agentHandoff.ts`.
- Tests: `test/controllers/agent_handoffs_controller_test.rb`; frontend `SendToAgent.test.tsx`, `data/agentHandoff.test.ts`.
- **Not built:** the "Claude, run by Inertia" destination (a run that reads the documents needs the worker tools in `ai-worker-tools`, and the Anthropic key) and delivery by webhook.

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Configuration
`ANTHROPIC_API_KEY` (see `docs/services.md` and the configuration table in `docs/deployment.md`) comes from Coolify's environment through `docker-compose.coolify.yml`; it is read once at boot, so a change needs a restart. The dev compose does not pass it, so local development never reaches Anthropic unless you export it yourself. Jobs use the in-process queue, so queued runs are lost on restart.

## Tests
`backend/test/models/ai_run_test.rb`, `test/services/ai_workers_runner_test.rb` (fake client, and the real Anthropic client over a stubbed transport: success with usage, a 429, no key), `test/services/ai_workers_anthropic_client_test.rb` (streaming, errors, refusals, timeouts, the key staying out of errors), `test/services/ai_workers_http_transport_test.rb` (a throwaway local server), `test/controllers/ai_runs_controller_test.rb`.

## Known limits
The foundation supports multiple named workers per Space. The product spec (Alex, 2026-10-19) defaults to one AI worker per Space shown as an assignee with an AI badge; which to follow is pending Alex's confirmation (see `docs/backlog/ai-worker-assign-and-auto-run.md`). Alex clarified on 2026-10-19 that the AI worker means sending Inertia's docs to Claude or another agent to do the work, with the app updating live as the agent edits; see `docs/backlog/ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`.

The adapter uses plain HTTPS, not the official `anthropic` gem (adding the gem needs a networked `bundle add` and Alex's go-ahead). The client's `complete` interface and `Reply` stay the same if it is swapped in later. There is no UI, no per-Space cost cap (usage is only recorded), no retry or cancel, no automatic retry on a rate limit (the run fails and can be queued again), and runs stuck in `running` after a restart are not cleaned up. Replies are plain text with no tool use, so a run still cannot edit anything.

## History
- Implemented 2026-10-18 (foundation only). Committed locally; not pushed or deployed.
- Not verified: the tests were not run (no gems installed), the migration was not run, and no real model call was made.
- Implemented 2026-11-09 (Anthropic adapter, on branch `backlog/ai-worker-anthropic-adapter`, not merged or deployed): streaming client, error mapping, initializer, token columns (migration `20261108150001`). Checked offline: Ruby syntax of every file, and the client, parser and stream tests under plain Ruby with ActiveSupport. Not run: the Rails test suite, the migration, the local-server transport test (the sandbox blocks binding a port), and any call to the real API.
- Not implemented: the official gem, a usage cap or usage screen, retries.
- Send to agent (the copy-and-paste destination) rebuilt on main 2026-11-10 on main's agent tokens and MCP server, from `backlog/ai-worker-send-docs-to-agent`. Owners only. Verified: `rails test`, RuboCop, Brakeman, `tsc -b`, Jest, ESLint, the migration, and the handoff in the browser.
