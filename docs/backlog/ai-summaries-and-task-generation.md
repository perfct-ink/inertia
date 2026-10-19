---
priority: p3
depends_on: [ai-worker-anthropic-adapter]
components: [backend]
---
# AI: summaries, task generation and AI fields

## Objective

(Builds on the AI worker: the `ai-worker-*.md` tasks.) AI: summarize a milestone/initiative, generate tasks from a description, AI fields (categorize, extract, summarize)

## Requirements / notes

Monday sidekick / AI columns.

## Context

Section "Platform, AI, admin" of the retired shared backlog.

## Acceptance criteria

- (Builds on the AI worker: the `ai-worker-*.md` tasks.) AI: summarize a milestone/initiative, generate tasks from a description, AI fields (categorize, extract, summarize) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
