# Retrospective boards

## What it does
A retrospective board is where a team looks back on a sprint (or any stretch of work). Open **Retrospectives** in the icon rail (Planning group, `/retrospectives`).

- **Create a board**: "New retrospective" asks for a title, a template and, optionally, a sprint. With no title typed, the title is the sprint's ("Sprint 7 retrospective") or the date ("Retrospective 2026-11-02"). The template decides the columns and cannot be changed afterwards, because cards are filed under its columns:

  | Template | Columns |
  | --- | --- |
  | Went well, to improve, actions (default) | Went well, To improve, Action items |
  | Start, stop, continue | Start, Stop, Continue, Action items |
  | 4 Ls | Liked, Learned, Lacked, Longed for, Action items |
  | Mad, sad, glad | Mad, Sad, Glad, Action items |

- **Projects**: a board belongs to the project that is open when it is made (like sprints, see [projects.md](projects.md)); the list shows only that project's boards, or all of the Space's with no project open. A board made with no project open is Space-wide. The sprint picker lists the same project's sprints.
- **The board** (`/retrospectives/:id`): the columns sit side by side on a wide screen and stack on a phone. An empty column shows a prompt ("What slowed us down?"). Each column has an "Add a card" field (Enter or Add).
- **Cards**: edit the text (a dialog), delete (asks first), and move to another column with the "Move card to column" picker (no drag and drop). Text is at most 1000 characters.
- **Votes**: a thumbs-up button on each card; one vote per person per card, press again to take it back. Only the count and whether you voted are shown, never who else voted. "Sort by votes" puts the most voted cards first in each column (this view only; the default is the order cards were added).
- **Action items become tasks**: a card in the Action items column has "Create task". It creates a backlog task in the Space, filed in the board's project (title is the card text on one line, cut at 255 characters; the full text is the description when it differs). The status history shows who made it. The card then reads "Task created". Only action items can become tasks, and only once; deleting the task lets the card make a new one. The task is not put in a sprint.
- **Board actions**: rename, delete (confirmation; cards and votes go with it, tasks already made stay). A board links to its sprint's Workboard.
- **Live-ish**: an open board refetches every 10 seconds so teammates' cards and votes show up. It stops refetching if the board can no longer be loaded (e.g. someone deleted it).
- Failed calls show the app's error notice (the shared API client); a failed "Add" keeps the typed text.

## Templates
The four templates are built in, in `frontend/src/data/retrospective.ts` (`RETRO_TEMPLATES`), and the column keys are checked against `Retrospective::TEMPLATES` on the server. A template has the same outline as a project type in `data/projectType.ts` on `backlog/project-types` (a `key`, a `label`, a `description`, and what it starts with: here `columns`), so a project type could later name a retrospective template to start with. Nothing links them yet: a retrospective is made from its own "New retrospective" dialog, not by a project type, and users cannot save their own templates.

## API and models
- `retrospectives`: `workspace_id`, `folder_id` (the project; nullable, cleared when the project is deleted, same Space only: `ProjectItem`), `sprint_id` (nullable, cleared if the sprint is deleted), `created_by_id` (nullable), `title` (required), `template` (one of `went_well`, `start_stop_continue`, `four_ls`, `mad_sad_glad`; default `went_well`; cannot change after create).
- `retro_cards`: `retrospective_id`, `author_id` (nullable; stored and returned but not shown), `task_id` (nullable, cleared if the task is deleted), `column_key` (must be one of the template's columns), `body` (required, at most 1000 characters).
- `retro_votes`: `retro_card_id`, `user_id`; unique per card and person. Deleted with the card or the user.
- Migrations `20261108290001_create_retrospectives`, `20261108290002_create_retro_cards`, `20261108290003_create_retro_votes`.
- Column keys live in `Retrospective::TEMPLATES` (`backend/app/models/retrospective.rb`); the labels, prompts and the same keys live in `frontend/src/data/retrospective.ts`. A test on each side fixes the keys, so keep the two in step by hand.
- Endpoints under `/api/v1`:
  - `GET /retrospectives` (newest first, narrowed by `X-Project-Id`, with `cards_count` and `tasks_count`), `POST /retrospectives` (`title`, `template`, `sprint_id`, `folder_id`; filed in the open project when no `folder_id` is sent), `GET /retrospectives/:id` (the board: adds `cards`, each with `votes_count` and `voted`; ignores the project header), `PATCH /retrospectives/:id` (`title`, `sprint_id`, `folder_id` only), `DELETE /retrospectives/:id`.
  - `POST /retro_cards` (`retrospective_id`, `column_key`, `body`), `PATCH /retro_cards/:id` (`body`, `column_key`), `DELETE /retro_cards/:id`.
  - `POST` and `DELETE /retro_cards/:id/vote` (cast or take back your vote; answers with the card), `POST /retro_cards/:id/task` (422 if the card is not an action item or already has a task).
- Frontend: `api/retrospectives.ts`, `api/retroCards.ts` (classes on the shared `ApiResource` base), `data/retrospective.ts` (types, templates, grouping and sorting, summary, title suggestion), `components/file-manager/projectSections.ts` (the rail entry).

## Who can view and change
Everything is scoped to the current Space (`X-Workspace-Id`); a board or card of another Space is 404. Viewers can open boards; adding, editing, voting and creating tasks need the member role or above (403 otherwise). Any member can edit, move or delete any card and delete a board: there are no per-author limits, matching the rest of the app.

## Web entry points
`/retrospectives` (`view/retrospectives/RetrospectivesScreen.tsx`) and `/retrospectives/:id` (`view/retrospective_board/RetrospectiveBoardScreen.tsx`), reached from the "Retrospectives" icon in the rail.

## Tests
- `backend/test/models/retrospective_test.rb` (templates, validations, fixed template, same-Space sprint and project, task creation rules and project, votes, cascades)
- `backend/test/controllers/retrospectives_controller_test.rb` (create from a template, cards, anonymous votes, tasks, the open project, other-Space isolation, viewers)
- `frontend/src/data/retrospective.test.ts`, `frontend/src/view/retrospectives/RetrospectivesScreen.test.tsx`, `frontend/src/view/retrospective_board/RetrospectiveBoardScreen.test.tsx`, `frontend/src/components/file-manager/SidebarRail.test.tsx` (the rail link)

## Known limits
- Cards move with a picker, not by dragging, and have no order of their own (added order, or by votes). See `docs/backlog/retrospective-drag-vote-limits-and-reveal.md`.
- No limit on votes per person, no "hide cards until everyone has written" mode, no grouping of similar cards, and no timer. Same backlog file.
- Not live: the board refetches every 10 seconds rather than pushing changes, and two people editing the same card at once is last write wins.
- The rail icon is not highlighted on a board's own page (`/retrospectives/:id`), because `isActivePath` matches a path exactly; the "All retrospectives" link leads back.
- A sprint's own page does not link to its retrospective; the board links the other way.
- No custom templates or columns; the four templates are fixed in code. Copying or moving a project to another Space does not carry its boards (the same gap as sprints and ideas, see `move-folder-attached-records-between-spaces.md`).

## History
- Implemented 2026-11-01 on branch `backlog/retrospective-board-template`, first pass; resumed and rebased onto `main` on 2026-11-09, when boards became project items (`folder_id`, the rail entry in `projectSections.ts`), tasks made from cards got their project and maker, and deleting a card started asking first. Not merged or deployed.
- Not implemented: drag and drop, vote limits, reveal mode, custom templates, a project type that starts with a board.
- Not verified: the Rails migrations, the Rails tests and RuboCop/Brakeman were not run (no database, no network); only `ruby -c` on every Ruby file. `npm run lint`, the TypeScript type-check and the full Jest suite were not run (no `node_modules`). Ran: the pure data tests and the component suites with the offline Jest stand-in (its Radix dialog is a stub, so the real dialogs were not exercised), a Sass compile, and the offline static import checks. Not seen in a browser at 375px or in dark mode; the styles use the theme tokens and a wrapping grid, but that is unconfirmed.
