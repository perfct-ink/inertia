---
priority: p3
depends_on: []
components: [backend]
branch: backlog/public-api-and-webhooks
status: incomplete
---
# Public API (REST today; Monday uses GraphQL) and webhooks

## Objective

Public API (REST today; Monday uses GraphQL) and webhooks

## Context

Section "Platform, AI, admin" of the retired shared backlog.

## Acceptance criteria

- Public API (REST today; Monday uses GraphQL) and webhooks works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not built: one line ("Public API (REST today; Monday uses GraphQL) and webhooks") and two parts that each carry a decision. What exists: a JSON REST API under `/api/v1` used by the web and Mac apps, authenticated with a short-lived JWT from sign-in (`Authorization: Bearer`), scoped to a Space by the `X-Workspace-Id` header and to a project by `X-Project-Id`. It was built for the app's own clients, not as a stable public contract.

Decisions needed from Alex: (1) *Public API*: keep REST (cheapest: document the existing endpoints, version them, add personal API tokens that don't expire with a session, rate limits and an OpenAPI description) or add GraphQL; which resources are public; who may create tokens (every member, or admins). A conservative first slice is personal API tokens per user and Space with a read-only scope, an OpenAPI file for tasks, documents and epics, and rate limits. (2) *Webhooks*: outbound calls to a URL a person gives, on events (task created, status changed, ...), signed with a secret, with retries and a delivery log. That needs a background queue to deliver reliably; this app has none (checked: no job runner is configured), and adding one is the "no new infrastructure without asking" call in `docs/rules/conventions.md`. Synchronous delivery inside the request would slow or fail saves, so it should not be the answer.

`backlog/rule-builder-trigger-condition-action` (automations) and `backlog/ai-worker-agent-access` (agent tokens) both overlap with tokens and events: settle those before building a third mechanism.
