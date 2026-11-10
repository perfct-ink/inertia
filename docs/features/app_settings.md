# App settings (environment variables)

## What it does
`AppSettings` (`backend/config/initializers/app_settings.rb`) is the one place the backend reads environment variables. Controllers and services call it instead of `ENV`: `bypass_auth?`, `web_url`, `app_url`, `oauth_callback_base_url`, `social_credentials(provider)` and `missing_social_variables(provider)`. The variable names and defaults are unchanged (`docs/services.md`).

**Behaviour change:** `BYPASS_AUTH=true` is now ignored in production (it used to run every request as the first user in any environment, kept off only by convention).

Values are read when asked, not copied once at boot, so the many tests that set a variable for one case (53 files use `BYPASS_AUTH`) keep working; the task asked for "read once", and this is the conservative form of it.

## API and models
None. Used by `ApplicationController`, `MarketingController`, `Auth::SocialSignIn` and `Quip::Importer`.

## Who can view and change
Developers only. No permission rules changed, except that the production bypass is closed.

## Tests
`backend/test/initializers/app_settings_test.rb`, including the production bypass (a request with `BYPASS_AUTH=true` in production is a 401) and a guard that fails if `ENV` appears under `app/` or `lib/`.

## Known limits
Not run: `rails test`, RuboCop. Later code that reads `ENV` (for example `HealthController` on branch `backlog/health-and-status-endpoints`) must be moved onto `AppSettings` when it merges, or the guard test fails.

## History
- 2026-11-10: built on branch `backlog/parse-env-in-initializers`; unverified (no Rails here); not deployed.
