---
priority: p0
depends_on: []
components: [backend]
branch: backlog/ai-worker-anthropic-adapter
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

Alex, 2026-10-19: "I want to prioritize AI worker." This is the first thing to pick up, ahead of every other P0. Working definition, pending Alex's confirmation: an **AI teammate** you assign work to the same way you assign a person. It reads the Space (documents, collections, tasks), does the task, and hands the result back for review. The writing-assistant features (`ai-summaries-and-task-generation.md`) and background triage come after it and reuse it.

Foundation vs spec: the foundation in `docs/features/ai_workers.md` supports multiple named workers per Space (each with its own instructions and model). The spec's default is **one AI worker per Space, shown as an assignee with an AI badge**. Which of the two to follow is pending Alex's confirmation; until then keep the multi-worker data model and build the single-worker presentation as a default (for example, a Space's first enabled worker) rather than removing workers.

Original row: **AI provider configuration**: model provider, API key and per-Space usage tracking, documented in `docs/services.md`. Default: Anthropic's Claude API, with the key as a server-side environment variable, never sent to the browser. (Today: not present.)

## Added requirements

- Per-Space usage tracking, recorded as runs complete (the cap itself is `ai-worker-limits-and-cost.md`).
- The key stays server-side and is never sent to the browser.

## Acceptance criteria
- With a key set, a queued run ends `succeeded` with output; with no key it fails with the existing message.
- A test covers success and an API error using a stubbed SDK client.

## Blocked

Done on branch `backlog/ai-worker-anthropic-adapter`: `AiWorkers::AnthropicClient` (refusals and API errors become failed runs), `AiWorkers::Reply`, the initializer that enables it when the key and gem are present, per-run token usage (`input_tokens`, `output_tokens`, migration `20261019000001`) and `Workspace#ai_tokens_used`, a stubbed-SDK test, and the `docs/services.md` and `docs/features/ai_workers.md` updates.

Still to do, and why it is blocked:
- Add the gem: run `bundle add anthropic` where there is network, so `Gemfile.lock` is updated (a Gemfile change without the lock breaks installs). Without it the initializer leaves AI workers off.
- Run the tests and the migration, and make one real call with a key. Nothing here has been run.
- Streaming and server-side refusal fallbacks (`fallbacks` with the `server-side-fallback` beta) are not done; the Ruby SDK binding for them still needs checking.
- Then remove this file and finish the `docs/features/ai_workers.md` History.
