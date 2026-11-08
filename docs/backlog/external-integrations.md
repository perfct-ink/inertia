---
priority: p3
depends_on: []
branch: backlog/external-integrations
status: incomplete
---
# Integrations: Slack, GitHub/GitLab, Google Calendar, email-to-task

## Objective

Integrations: Slack, GitHub/GitLab, Google Calendar, email-to-task

## Context

Section "Platform, AI, admin" of the retired shared backlog.

## Acceptance criteria

- Integrations: Slack, GitHub/GitLab, Google Calendar, email-to-task works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not built: one line ("Integrations: Slack, GitHub/GitLab, Google Calendar, email-to-task") covering four integrations, each needing an external account, OAuth client or inbound mail address that only Alex can set up, and none can be exercised without network access. `docs/rules/documentation.md` requires every external service to be documented with its configuration variables (`docs/services.md`), and `docs/rules/conventions.md` says not to add services without asking.

Suggested split, with what each needs: (1) *Slack*: an app with incoming webhooks or the Web API for notifications (a Slack app and signing secret; depends on the notifications inbox that exists, and webhooks need a background queue the app does not have). (2) *GitHub/GitLab*: link a task to an issue or pull request and update status from webhooks (an OAuth app or token, an inbound webhook endpoint with signature checks). (3) *Google Calendar*: two-way sync with events (Google OAuth consent screen, a verified app for sensitive scopes, token storage and refresh; `backlog/geocode-collection-locations` shows the provider-abstraction pattern for a disabled-by-default service). (4) *Email-to-task*: an inbound address per Space (an email provider with inbound parsing, such as a mail service webhook) that turns messages into tasks, with sender verification and spam handling.

Decisions needed from Alex: which integration first, the accounts and keys to use, and whether integrations are per Space (a connected app per workspace) or per person. Each needs a disabled-by-default adapter, `docs/services.md` entries, and a test double for the provider.
