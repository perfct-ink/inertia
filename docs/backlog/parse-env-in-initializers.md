---
priority: p2
depends_on: []
components: [backend, docs]
branch: backlog/parse-env-in-initializers
status: incomplete
---
# Read environment variables only in initializers

## Objective

The backend parses environment variables in one dedicated place (`backend/config/initializers/`) and the rest of the code reads the parsed settings, as `docs/rules/backend.md` (Initializers) asks.

## Context

The rules audit (see `docs/features/rules_compliance.md`) found `ENV` read in application code:

- `app/controllers/application_controller.rb`: `ENV["BYPASS_AUTH"]` (development sign-in bypass)
- `app/controllers/marketing_controller.rb`: `ENV.fetch("WEB_URL")`
- `app/services/auth/social_sign_in.rb`: `GOOGLE_*`, `APPLE_*` and `OAUTH_CALLBACK_BASE_URL`
- `app/services/quip/importer.rb`: `ENV.fetch("APP_URL")`

## Requirements / notes

- Add an initializer that reads these once and exposes them (for example `Rails.configuration.x.*` or a small `Settings` object), validating what must be present in production. Controllers and services read the setting, so tests can set it without touching `ENV`.
- `BYPASS_AUTH` is a security-sensitive switch: `application_controller.rb` honours `ENV["BYPASS_AUTH"] == "true"` in any environment, and only convention keeps it off in production (`docs/services.md` says never enable it, and `docker-compose.coolify.yml` does not set it). Have the initializer ignore it, or refuse to boot, when `Rails.env.production?`, and add a test that proves it. That is a behaviour change, so say so in the commit.
- Keep the variable names; they are listed in `docs/services.md`, `docs/deployment.md` and `docker-compose.coolify.yml`, and none of those change.
- Request and service tests for the moved reads (social sign-in not configured, marketing links using `WEB_URL`).

## Acceptance criteria

- No `ENV` reads remain under `backend/app/` or `backend/lib/`.
- `rails test` and RuboCop pass; behaviour is unchanged.

## Unverified

Built without Rails or RuboCop. Run `rails test` (especially `test/initializers/app_settings_test.rb`, the social sign-in and marketing controller tests) and `bundle exec rubocop`, then delete this file. The settings are read when asked rather than once at boot, to keep the tests that set `ENV` valid.
