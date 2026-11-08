---
priority: p3
depends_on: []
branch: backlog/audit-log-sso-mfa-data-export
status: incomplete
---
# Audit log, SSO, MFA, data export

## Objective

Audit log, SSO, MFA, data export

## Context

Section "Platform, AI, admin" of the retired shared backlog.

## Acceptance criteria

- Audit log, SSO, MFA, data export works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Deliberately not built: one line ("Audit log, SSO, MFA, data export") covering four independent features, three of which need accounts, secrets or infrastructure that only Alex can supply. Suggested split for the next grooming, smallest first:

1. **Data export** (no new infrastructure): a Space admin downloads their Space as a ZIP of JSON/Markdown/CSV (documents, Collections, tasks, events, folders). Needs a decision on the format and on large Spaces (build synchronously with a size limit, or defer until the app has a background queue, which it does not).
2. **Audit log**: who changed what and when, for admin-relevant events (members and roles, sharing, deletes). `backlog/activity-log-per-item` is a per-item activity log that overlaps; decide whether the audit log is a view of the same events. Needs a retention policy and who can read it (admins only is the conservative default).
3. **MFA**: TOTP (an authenticator app) with recovery codes is the usual first step; needs a library (`rotp`) and a login flow change, and the Mac app's native login has to support the second step. A product call: optional or enforced per Space.
4. **SSO** (SAML or OIDC): needs an identity provider to test against, a library, per-Space configuration, and an account-linking policy; also the largest and the one that affects security the most.

Decisions needed from Alex: which of the four first, and whether MFA and SSO are for paying Spaces only. Anything that touches sign-in needs a real browser and Rails test run before it merges.
