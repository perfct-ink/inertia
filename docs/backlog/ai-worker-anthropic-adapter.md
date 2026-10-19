---
priority: p1
depends_on: []
components: [backend]
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

## Acceptance criteria
- With a key set, a queued run ends `succeeded` with output; with no key it fails with the existing message.
- A test covers success and an API error using a stubbed SDK client.
