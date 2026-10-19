# AI workers

## What it does
The data model and background job for handing a task to a named AI worker and storing its reply. **A model adapter exists but is switched off** until the `anthropic` gem is installed and `ANTHROPIC_API_KEY` is set: until then every run fails with "No AI client is configured". There is no UI.

A worker has a name, instructions (its system prompt), a model (default `claude-opus-5-5`) and an enabled flag. A run is one attempt at one task: status `queued`, `running`, `succeeded` or `failed`, plus `output`, `error` and timestamps. A run only stores text; it cannot change tasks or documents.

Rules: the worker must be enabled; worker and task must belong to the same Space; a task cannot have two active (queued or running) runs from the same worker.

## API and models
- Tables `ai_workers`, `ai_runs`; models `AiWorker`, `AiRun`.
- `GET/POST /api/v1/ai_workers`, `PATCH/DELETE /api/v1/ai_workers/:id`.
- `GET /api/v1/ai_runs` (optional `task_id`, newest 100), `POST /api/v1/ai_runs` (queues `AiWorkerRunJob`).
- `AiWorkers::Runner` runs a queued run and records a client error on it instead of raising. `AiWorkers::Prompt` builds the prompt: the worker's instructions plus fixed rules as the system prompt, the task's title, status, due date and description in the user turn. The model call goes through `AiWorkers.client`: `AiWorkers::AnthropicClient` (Messages API, `claude-opus-5-5` by default, one non-streaming request of up to 16,000 tokens; a refusal or API error becomes a failed run with a readable message) when `config/initializers/ai_workers.rb` finds the key and the gem, otherwise the unconfigured client. A client returns an `AiWorkers::Reply` (text and token counts); each run stores `input_tokens` and `output_tokens`, and `Workspace#ai_tokens_used` sums them per Space.

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Configuration
`ANTHROPIC_API_KEY` (server-side only) and the `anthropic` gem, which is **not yet in the Gemfile** because `Gemfile.lock` needs a networked `bundle add anthropic`. See `docs/services.md`. Jobs use the in-process queue, so queued runs are lost on restart.

## Tests
`backend/test/models/ai_run_test.rb`, `test/services/ai_workers_runner_test.rb` (fake client), `test/controllers/ai_runs_controller_test.rb`, `test/services/ai_workers_anthropic_client_test.rb` (stubbed SDK client: text and usage, refusal, runner integration).

## Known limits
The foundation supports multiple named workers per Space. The product spec (Alex, 2026-10-19) defaults to one AI worker per Space shown as an assignee with an AI badge; which to follow is pending Alex's confirmation (see `docs/backlog/ai-worker-assign-and-auto-run.md`).

The adapter is not streaming and does not yet request server-side refusal fallbacks (the Ruby binding for those was not available to check). No UI, no cost limits, no retry or cancel, and runs stuck in `running` after a restart are not cleaned up. Task text would be sent to Anthropic once connected.

## History
- Implemented 2026-10-18 (foundation only). Committed locally; not pushed or deployed.
- Not verified: the tests were not run (no gems installed), the migration was not run, and no real model call was made.
- Adapter added 2026-10-19 on branch `backlog/ai-worker-anthropic-adapter`, not merged to `main` because the gem could not be added offline. Not verified: nothing was run (tests, migration), and no real API call was made, so the SDK calls follow the documented Ruby examples only.
