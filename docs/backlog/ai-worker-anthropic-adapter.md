---
priority: p1
depends_on: []
components: [backend]
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

## Verified (2026-11-09)

Merged to main: `rails test` (599 runs, 0 failures), rubocop, brakeman, `tsc -b`, Jest, eslint and `db:migrate` (no schema diff) pass. The adapter is inert until `ANTHROPIC_API_KEY` is set, so only the Blocked items above remain: the gem decision, the key in Coolify, and a real call once the key is set.
