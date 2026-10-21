---
priority: p1
branch: backlog/invite-people-without-an-account
depends_on: []
---
# Invite people without an account (email invitation, pending membership)

## Objective

Invite people without an account (email invitation, pending membership)

## Requirements / notes

Today members are added by the email of an existing user.

## Context

Section "Frontend conventions follow-up" of the retired shared backlog.

Tailwind has been removed; the frontend uses SCSS (`frontend/src/styles/` for app-wide tokens, reset, theme, typography and spacing; a `.scss` beside each component; `ui-` and `view-` root classes). These items finish aligning the code with `AGENTS.md`.

## Acceptance criteria

- Invite people without an account (email invitation, pending membership) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on the branch with tests; see `docs/features/space_invitations.md`. Email delivery is not built (no mail service is configured), so the inviter copies a link; sending the email needs SMTP credentials and a mailer, which is a product and infrastructure call. Not run (no network, node_modules or database): `rails db:migrate` (then diff `backend/db/schema.rb`, which was hand-edited), `rails test`, `cd frontend && npm install && npm run lint && npm test`, and a browser pass through invite, sign-up and join. Then remove this file and merge.
