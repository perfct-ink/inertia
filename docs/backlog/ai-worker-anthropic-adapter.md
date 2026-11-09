---
priority: p1
depends_on: []
components: [backend]
branch: backlog/ai-worker-anthropic-adapter
status: incomplete
---
# AI worker: Anthropic model adapter

## Objective
Connect `AiWorkers.client` to the Anthropic API so a queued run actually produces a reply.

## Requirements
- Add the official `anthropic` Ruby gem and update `Gemfile.lock` (needs network; do this before merging).
- Implement a client with `complete(model:, system:, prompt:)` that returns the reply text, reading `ANTHROPIC_API_KEY`; default model `claude-opus-5-5`.
- Stream the reply (long outputs), and turn refusals, rate limits and timeouts into failed runs with a readable error.
- Set it as the default client in an initializer when the key is present; leave the unconfigured client otherwise.
- Update `docs/services.md` and `docs/features/ai_workers.md`.


## Spec from the retired shared backlog (section 0, AI worker, P0)

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Alex confirmed the meaning on 2026-10-19: the AI worker is pushing Inertia's docs to Claude or another agent to start the work, with the app updating live as the agent changes the docs. The core tasks are `ai-worker-agent-access.md`, `ai-worker-send-docs-to-agent.md` and `ai-worker-live-updates.md`; this task supports the "Claude, run by Inertia" path.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **AI provider configuration**: model provider, API key and per-Space usage tracking, documented in `docs/services.md`. Default: Anthropic's Claude API, with the key as a server-side environment variable, never sent to the browser. (Today: not present.)

## Added requirements

- Per-Space usage tracking, recorded as runs complete (the cap itself is `ai-worker-limits-and-cost.md`).
- The key stays server-side and is never sent to the browser.

## Acceptance criteria
- With a key set, a queued run ends `succeeded` with output; with no key it fails with the existing message.
- A test covers success and an API error using a stubbed SDK client.

## Blocked

Needs Alex: the official gem, and the key.

- **No `anthropic` gem (decision for Alex).** The requirement asks for the official gem and a `Gemfile.lock` update. Adding it needs a networked `bundle add`, a new dependency, and Alex's go-ahead, none of which a session without network can do. The conservative version is built instead: `AiWorkers::AnthropicClient` talks to the Messages API with plain `Net::HTTP` (streaming, through `AiWorkers::HttpTransport`) behind the same `complete(model:, system:, prompt:)` interface. To swap in the gem later: `cd backend && bundle add anthropic`, then replace the body of `AnthropicClient#complete` (and drop `HttpTransport`, `SseParser` and `MessageStream`) with the gem's streaming call, returning an `AiWorkers::Reply` and raising `AiWorkers::ProviderError` for the failures the tests cover. Nothing else changes. Keeping the plain-HTTPS client is also fine.
- **The key.** Set `ANTHROPIC_API_KEY` in Coolify's environment variables for the `inertia` resource (mark it secret), then redeploy or restart the `api` service. Until then workers stay off and runs fail with "No AI client is configured". The key is read only in `backend/config/initializers/ai_workers.rb`.
- **Privacy to confirm.** Once the key is set, a task's title, status, due date and description and the worker's instructions are sent to Anthropic when a worker runs. There is no UI for workers yet; say so wherever one is added.

## Unverified

Built and committed on this branch, but only partly checked (no network, no `bundle`, no database, no Docker here).

Ran: Ruby syntax check of every changed `.rb` file; the 12 client, SSE parser and stream tests in `backend/test/services/ai_workers_anthropic_client_test.rb` under plain Ruby with ActiveSupport and a stub test helper; the markdown and yml edits were read back.

Not run:
- The Rails suite, including `ai_workers_runner_test.rb` (the queued-run success and 429 tests through the real client with a canned transport) and the `AiRun.token_usage` test.
- The migration `20261108150001_add_usage_to_ai_runs.rb` (nullable `input_tokens` and `output_tokens` on `ai_runs`; `schema.rb` was edited by hand).
- `ai_workers_http_transport_test.rb`: it starts a local server and the sandbox here refuses to bind a port.
- Any call to the real API: the request shape, headers, the streamed event handling and the model id `claude-opus-5-5` are checked only against the documented API and the stubs.

To verify, on a machine with the dependencies:

```sh
cd backend && rails db:migrate && git diff db/schema.rb
cd backend && rails test test/services test/models/ai_run_test.rb test/controllers/ai_runs_controller_test.rb
make lint-backend
# real call: queue a run with a key set, then read its output and token counts
cd backend && ANTHROPIC_API_KEY=sk-ant-... rails runner 'u = User.first; w = u.workspace; worker = w.ai_workers.first_or_create!(name: "Writer", instructions: "Be brief."); run = w.ai_runs.create!(ai_worker: worker, task: w.tasks.first); AiWorkerRunJob.perform_now(run.id); r = run.reload; p r.status, r.output, r.error, r.input_tokens, r.output_tokens'
```

Also confirm the unset case: the same command with no key must end `failed` with "No AI client is configured". After merging, delete this file: `docs/features/ai_workers.md` already describes the adapter.
