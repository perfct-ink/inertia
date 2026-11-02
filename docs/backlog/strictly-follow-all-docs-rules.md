---
priority: p1
depends_on: []
components: [frontend, backend, macos, docs]
branch: backlog/strictly-follow-all-docs-rules
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

## Blocked
Incomplete. The agent working on this task was cut off by the API daily cost limit (HTTP 429) before it finished, so the work so far is committed as it stood. Nothing was run beyond what the commit message lists. To finish: read the diff against main (`git diff origin/main...backlog/strictly-follow-all-docs-rules`), complete the requirements and acceptance criteria above, write or update the feature doc in `docs/features/` and its README row, run the checks (`cd frontend && npm install && npm run lint && npm test`, `cd backend && rails db:migrate && rails test`), then remove this file.
