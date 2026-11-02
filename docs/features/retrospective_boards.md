# Retrospective boards

## What it does
A retrospective board is where a team looks back on a sprint (or any stretch of work). Open **Retrospectives** in the sidebar rail (`/retrospectives`).

- **Create a board**: "New retrospective" asks for a title, a template and, optionally, a sprint. With no title typed, the title is the sprint's ("Sprint 7 retrospective") or the date ("Retrospective 2026-11-02"). The template decides the columns and cannot be changed afterwards, because cards are filed under its columns:

  | Template | Columns |
  | --- | --- |
  | Went well, to improve, actions (default) | Went well, To improve, Action items |
  | Start, stop, continue | Start, Stop, Continue, Action items |
  | 4 Ls | Liked, Learned, Lacked, Longed for, Action items |
  | Mad, sad, glad | Mad, Sad, Glad, Action items |

- **The board** (`/retrospectives/:id`): the columns sit side by side on a wide screen and stack on a phone. An empty column shows a prompt ("What slowed us down?"). Each column has an "Add a card" field (Enter or Add).
- **Cards**: edit the text (a dialog), delete, and move to another column with the "Move card to column" picker (no drag and drop). Text is at most 1000 characters.
- **Votes**: a thumbs-up button on each card; one vote per person per card, press again to take it back. Only the count and whether you voted are shown, never who else voted. "Sort by votes" puts the most voted cards first in each column (this view only; the default is the order cards were added).
- **Action items become tasks**: a card in the Action items column has "Create task". It creates a backlog task in the Space (title is the card text on one line, cut at 255 characters; the full text is the description when it differs). The card then reads "Task created". Only action items can become tasks, and only once; deleting the task lets the card make a new one. The task is not put in a sprint.
- **Board actions**: rename, delete (confirmation; cards and votes go with it, tasks already made stay). A board links to its sprint's Workboard.
- **Live-ish**: an open board refetches every 10 seconds so teammates' cards and votes show up. It stops refetching if the board can no longer be loaded (e.g. someone deleted it).
- Failed calls show the app's error notice (the shared API client); a failed "Add" keeps the typed text.

## API and models
- `retrospectives`: `workspace_id`, `sprint_id` (nullable, cleared if the sprint is deleted), `created_by_id` (nullable), `title` (required), `template` (one of `went_well`, `start_stop_continue`, `four_ls`, `mad_sad_glad`; default `went_well`; cannot change after create).
- `retro_cards`: `retrospective_id`, `author_id` (nullable; stored and returned but not shown), `task_id` (nullable, cleared if the task is deleted), `column_key` (must be one of the template's columns), `body` (required, at most 1000 characters).
- `retro_votes`: `retro_card_id`, `user_id`; unique per card and person. Deleted with the card or the user.
- Column keys live in `Retrospective::TEMPLATES` (`backend/app/models/retrospective.rb`); the labels, prompts and the same keys live in `frontend/src/data/retrospective.ts`. A test on each side fixes the keys, so keep the two in step by hand.
- Endpoints under `/api/v1`:
  - `GET /retrospectives` (newest first, with `cards_count` and `tasks_count`), `POST /retrospectives` (`title`, `template`, `sprint_id`), `GET /retrospectives/:id` (the board: adds `cards`, each with `votes_count` and `voted`), `PATCH /retrospectives/:id` (`title`, `sprint_id` only), `DELETE /retrospectives/:id`.
  - `POST /retro_cards` (`retrospective_id`, `column_key`, `body`), `PATCH /retro_cards/:id` (`body`, `column_key`), `DELETE /retro_cards/:id`.
  - `POST` and `DELETE /retro_cards/:id/vote` (cast or take back your vote; answers with the card), `POST /retro_cards/:id/task` (422 if the card is not an action item or already has a task).
- Frontend: `api/retrospectives.ts`, `api/retroCards.ts` (classes on the shared `ApiResource` base), `data/retrospective.ts` (types, templates, grouping and sorting, summary, title suggestion).

## Who can view and change
Everything is scoped to the current Space (`X-Workspace-Id`); a board or card of another Space is 404. Viewers can open boards; adding, editing, voting and creating tasks need the member role or above (403 otherwise). Any member can edit, move or delete any card and delete a board: there are no per-author limits, matching the rest of the app.

## Web entry points
`/retrospectives` (`view/retrospectives/RetrospectivesScreen.tsx`) and `/retrospectives/:id` (`view/retrospective_board/RetrospectiveBoardScreen.tsx`), reached from the "Retrospectives" button in the sidebar rail.

## Tests
- `backend/test/models/retrospective_test.rb` (templates, validations, fixed template, same-Space sprint, task creation rules, votes, cascades)
- `backend/test/controllers/retrospectives_controller_test.rb` (create from a template, cards, anonymous votes, tasks, other-Space isolation, viewers)
- `frontend/src/data/retrospective.test.ts`, `frontend/src/view/retrospectives/RetrospectivesScreen.test.tsx`, `frontend/src/view/retrospective_board/RetrospectiveBoardScreen.test.tsx`

## Known limits
- Cards move with a picker, not by dragging, and have no order of their own (added order, or by votes). See `docs/backlog/retrospective-drag-vote-limits-and-reveal.md`.
- No limit on votes per person, no "hide cards until everyone has written" mode, no grouping of similar cards, and no timer. Same backlog file.
- Not live: the board refetches every 10 seconds rather than pushing changes, and two people editing the same card at once is last write wins.
- Deleting a card has no confirmation.
- A sprint's own page does not link to its retrospective; the board links the other way.
- No custom templates or columns; the four templates are fixed in code. Document and project templates are separate backlog tasks (`project-and-item-templates.md`) and this feature does not depend on them.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/retrospective-board-template`), merged with main as of 2026-11-02.
- Not implemented: drag and drop, vote limits, reveal mode, custom templates.
- Not verified: the Rails migrations, the Rails tests and RuboCop/Brakeman were not run (no database, no network); only `ruby -c` on every Ruby file. `npm run lint`, the TypeScript type-check and the full Jest suite were not run (no `node_modules`). Ran: the pure data tests and the three new suites with the offline Jest stand-in (its Radix dialog is a stub, so the real dialogs were not exercised), a Sass compile, and the offline static import checks. Not seen in a browser at 375px or in dark mode; the styles use the theme tokens and a wrapping grid, but that is unconfirmed.
