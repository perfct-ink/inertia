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

## Who can view and change
Scoped to the current Space; I did not check role-based limits.

## Configuration
`ANTHROPIC_API_KEY` is documented in `docs/services.md` but not read yet. Jobs use the in-process queue, so queued runs are lost on restart.

## Tests
`backend/test/models/ai_run_test.rb`, `test/services/ai_workers_runner_test.rb` (fake client), `test/controllers/ai_runs_controller_test.rb`.

## Known limits
No model adapter, no UI, no cost limits, no retry or cancel, and runs stuck in `running` after a restart are not cleaned up. Task text would be sent to Anthropic once connected.

## History
- Implemented 2026-10-18 (foundation only). Committed locally; not pushed or deployed.
- Not verified: the tests were not run (no gems installed), the migration was not run, and no real model call was made.
