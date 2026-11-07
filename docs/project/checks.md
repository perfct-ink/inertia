## Checks and commands

The commands the shared rules mean by "lint", "tests" and "every check that can run" in this repo.

- **Lint:** `npm run lint` runs ESLint (`eslint.config.mjs`) and Stylelint (`stylelint.config.mjs`) over the repository and must report no errors. New and shared code follows the full rule sets (eslint:recommended plus the React and React Hooks sets; stylelint-config-standard-scss). The original page scripts and the views' stylesheets are checked for mistakes only, and API findings that would mean editing working code are warnings. `make lint-backend` runs RuboCop.
- **Tests:** `make test` runs the backend (`rails test`) and frontend suites; `make test-fast` is the short pre-commit suite. `make typecheck` runs the TypeScript type-checker.
- **Migrations:** `make db-migrate`, then check `backend/db/schema.rb`.
- **Mac app:** run the Swift build and tests when `macos/` changed (`make build-mac`).
- **Deploys:** pushing `main` deploys to production through Coolify once CI passes (see [deployment.md](deployment.md)).
