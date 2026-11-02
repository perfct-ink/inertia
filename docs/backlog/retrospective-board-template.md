---
priority: p2
depends_on: []
components: [frontend]
branch: backlog/retrospective-board-template
---
# Retrospective board template

## Objective

Retrospective board template

## Context

Section "Agile" of the retired shared backlog.

## Acceptance criteria

- Retrospective board template works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Built but unverified on a real stack; kept on its branch, not `main`.

**Decision for Alex.** The spec is one line, so "Retrospective board template" was read as a real board: a template (went well / to improve / actions, start / stop / continue, 4 Ls, mad / sad / glad) picks the columns of a board where Space members add cards, vote (anonymous counts, one vote per person per card) and turn action items into backlog tasks. It is self-contained: it does not use the document or project templates. Votes are anonymous and any member may edit any card; say if you want per-author edit limits. Follow-ups (drag, vote limits, reveal mode) are in `docs/backlog/retrospective-drag-vote-limits-and-reveal.md`.

**Done.** Migrations `20261102060001` to `20261102060003` (tables `retrospectives`, `retro_cards`, `retro_votes`; `schema.rb` hand-edited, version `2026_11_02_060003`), models, blueprints, four controllers and routes, Minitest tests; frontend data file, API classes, two views (`/retrospectives`, `/retrospectives/:id`), a sidebar rail button, Jest tests; feature doc `docs/features/retrospective_boards.md` and its README row. `origin/main` was merged in (the only conflict was `schema.rb`, resolved by keeping both sides' tables).

**Ran (offline).** `ruby -c` on every Ruby file; the pure data tests (`retrospective.test.ts` and the rest); the new component suites through the Jest stand-in (its Radix dialog is a stub); a Sass compile; the static import/JSX checks.

**Did not run (no network, `node_modules`, database).** `rails db:migrate` and the Rails tests (including the new model and controller tests), RuboCop, Brakeman, `npm run lint`, the TypeScript type-check, the full `npm test`, and a browser check.

**To verify and merge.**
```bash
cd backend && rails db:migrate   # then diff db/schema.rb against the committed one (tables, indexes, foreign keys, version)
cd backend && rails test && bin/rubocop && bin/brakeman
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
```
Then open `/retrospectives` in a browser: create a board from each template (with and without a sprint), add cards, vote from two accounts, move a card, create a task from an action item, delete the board. Check it at 375px and desktop, in light and dark. The sidebar rail button was added after the Sprints button, so a merge conflict there is likely if another branch also adds one; keep both lines. `Workspace` also gained `has_many :retrospectives`.
