---
priority: p1
depends_on: []
components: [frontend, backend, macos, docs]
branch: backlog/strictly-follow-all-docs-rules
status: incomplete
---
# Strictly follow all of the rules in docs/rules

## Objective

The app strictly follows every rule in `docs/rules/`. Audit the whole codebase (frontend, backend, collab server, macOS app, Makefile and docs) against each rule file and bring anything that breaks a rule into line, so the rules describe how the code actually is rather than how it should be.

Requested by Alex on 2026-11-01.

## Requirements / notes

- Go through every file in `docs/rules/`, one at a time: `product.md` (including the nine design principles), `ui-organization.md`, `code-requirements.md`, `documentation.md`, `feature-docs.md`, `backlog.md`, `backlog-mode.md`, `make-files.md`, `conventions.md`, `repo-layout.md`, `deployment.md` and `running-locally.md`.
- For each rule, check the code and record whether it is met. Fix small violations directly (with tests). A violation that needs real work becomes its own backlog file, unless one already covers it (for example `clear-eslint-warnings.md`, `base-api-file-plus-one-class-per-model.md`, `data-files-filtering-sorting-and-api-enums.md`, `promote-local-patterns-to-ui-components.md`, `wcag-keyboard-focus-and-contrast-audit.md`, `visual-qa-of-every-screen-in-light-and-dark-mode.md`, `lint-ruby-and-swift-from-root.md`); link to it rather than duplicating it.
- Rule files that disagree with each other or with the code need a decision, not a silent fix. Known ones: `conventions.md` and `repo-layout.md` describe a `web/` app on Tailwind with production, budget and screenplay features, while the repo has `frontend/` on SCSS and Volta; `conventions.md` says to commit only when asked and not push `main`, while Alex's standing preference is to push straight to `main`; `AGENTS.md` loads only eight of the twelve rule files. Propose the correction to Alex, then update the rule file or the code.
- Every page meets the design principles at 375px and desktop widths, in light and dark mode.
- `npm run lint`, the frontend type-check and tests, `rails test` and the Swift build all pass at the end.

## Acceptance criteria

- Every rule in every `docs/rules/` file has been checked against the code, and each is either met or covered by a linked backlog file that says how it will be met.
- No rule file contradicts another or describes code that doesn't exist; stale rules are corrected with Alex's agreement.
- `AGENTS.md` loads every rule file that applies to this repo.
- A feature doc in `docs/features/` (for example `rules_compliance.md`) lists each rule file, what was checked and what was fixed, and this file is removed.

## Unverified

Done on this branch: the audit against the current rule files (the list in the requirements above is stale; the current rules are the 15 in `docs/rules/`), written up in `docs/features/rules_compliance.md`; small fixes (raw controls and native date inputs replaced by `@/components/ui`, login/sign-up/sign-out moved into `api/auth.ts`, file URLs through `apiUrl`, four inline lists moved to `src/data/`, new lint rules for raw controls and native dialogs, `.sass-cache` untracked and ignored, CI concurrency that never cancels a run on `main`, Makefile `running`, grouped `help`, fuller `up`, `test` and `clean`, `README.md` and `docs/architecture.md`, doc corrections); five new backlog files for the real gaps (`health-and-status-endpoints`, `request-tests-for-untested-controllers`, `parse-env-in-initializers`, `marketing-pages-assets-from-files`, `native-mac-make-targets`); the rule disagreements are listed in the feature doc as notes for the agent-rules repo. Edits to two shipped migrations by the cut-off session were reverted.

This is incomplete rather than complete because the checks cannot run here (no network, `node_modules`, database, Docker):

- Ran: the pure unit tests and the Jest stand-in for the changed components (the failures `util/shortcuts.test.ts`, `data/task.test.ts` and `api/documents.test.tsx` also happen on `origin/main`; `EpicPlanScreen` and `HierarchyScreen` tests were skipped for lack of `@dnd-kit/core`), `make help` and `make -n`.
- Not run: `npm run lint`, `tsc -b`, the real Jest run, `rails test`, RuboCop, the Swift build, the Docker-based `make` targets, a browser look.

To verify, from the repo root:

```bash
npm run lint
cd frontend && npx tsc -b --force && npm test && cd ..
cd backend && bin/rails test && bin/rubocop && cd ..
make test        # backend, frontend, collab server, Swift tests on macOS
make running     # after make dev: prints Running, exits 1 when stopped
make help
```

Then in a browser at 375px and at desktop width, in light and dark: the date fields on the task detail, task table, epic plan, project details, project request form, resources allocation rows and the document initiative bar (each opens the calendar and saves a date); the sidebar pinned-item unpin button (faded in on hover or focus, always visible on a phone, the row does not change size); the project icon dialog's image upload; the hierarchy tree's expand arrows; sign-in, sign-up and sign-out. In the Mac app's WKWebView the same sign-in flow.

Open for Alex: the rule disagreements in the feature doc's notes, moving the compose files out of the root (needs a Coolify setting), and whether `make dev-live` stays given "local development never hits live services".
