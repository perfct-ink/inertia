## Checks and commands

The commands the shared rules mean by "lint", "tests" and "every check that can run" in this repo.

- **Lint:** `npm run lint` at the repo root runs ESLint and Stylelint in `frontend/` (`frontend/eslint.config.mjs`, `frontend/stylelint.config.mjs`) and ESLint in `collab-server/` (`collab-server/eslint.config.mjs`), and must report no errors. The frontend follows the full rule sets (eslint:recommended, typescript-eslint and the React and React Hooks sets; stylelint-config-standard-scss), plus errors for native dialogs and raw `<button>`, `<input>`, `<select>` or `<textarea>` outside `components/ui/`. React Compiler findings that would mean editing working code are warnings (see `docs/backlog/clear-eslint-warnings.md`). `make lint-backend` runs RuboCop but ends in `|| true`, so it never fails; CI's `rubocop` job does (see `docs/backlog/lint-ruby-and-swift-from-root.md`).
- **Tests:** `make test` runs every suite: the backend (`rails test`), the frontend (Jest), the collab server (Vitest) and, on macOS, the Swift tests; `make test-fast` is the short pre-commit suite (backend models and controllers, frontend, Swift). `make typecheck` runs the TypeScript type-checker.
- **Migrations:** `make db-migrate`, then check `backend/db/schema.rb`.
- **Mac app:** run the Swift build and tests when `macos/` changed (`make build-mac`).
- **Deploys:** pushing `main` deploys to production through Coolify once CI passes (see [deployment.md](deployment.md)).
