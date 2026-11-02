---
priority: p2
depends_on: []
components: [backend]
branch: backlog/comments-on-items
---
# Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Objective

Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies

## Current state

File-only extension; no backend Comment model

## Context

Section "Collaboration" of the retired shared backlog.

## Acceptance criteria

- Comments ("Updates") on tasks, epics, initiatives, milestones, with @mentions and replies works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Built and pushed on `backlog/comments-on-items`, but not merged: nothing here could be run against a database, `node_modules` or a browser.

**Done**: polymorphic `comments` and `comment_mentions` tables (migration `20261101210001`, `schema.rb` hand edited), `Comment`/`CommentMention` models, `Commentable` concern on Task/Epic/Initiative/Milestone, `Api::V1::CommentsController` (index/create/update/destroy), `CommentBlueprint`, route, locale names; web UI: a comments button on task rows and cards, epic, initiative and milestone cards that opens a dialog with threaded comments, replies, @mention suggestions, edit and delete (`components/comments/`, `api/comments.ts`, `data/comment.ts`); backend, data and component tests; feature doc `docs/features/comments.md`, README row, keyboard-shortcuts and ui-components notes.

**Checks run**: `ruby -c` on every changed Ruby file; the mention regex tried in plain Ruby; `data/comment.test.ts` (18 tests) and the component tests `Comments.test.tsx`, `CommentsButton.test.tsx`, `MilestonesScreen.test.tsx` through the stand-in Jest (`/tmp/runner/jest.sh`, lucide, zustand and Radix Dialog stubbed); sass compile of the changed SCSS; the offline static checks (`/tmp/runner/all.sh`).

**Checks not run**: `rails db:migrate` and the diff of `schema.rb`; `rails test` (the new `comment_test.rb` and `comments_controller_test.rb` were only syntax checked); `npm run lint` (ESLint and Stylelint), the type-check and the real `npm test`; looking at it in a browser.

**To verify and merge**:
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand edit (tables `comment_mentions` and `comments`, three foreign keys on `comments`, two on `comment_mentions`, `version: 2026_11_01_210001`), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`.
3. Browser, at 375px and desktop, light and dark: open the comment button on a task (backlog row and Kanban card), an epic, an initiative and a milestone; post, reply, type `@` and pick a member, edit, delete; sign in as a viewer and check that the box is hidden.
4. Merging: on 2026-11-02 origin/main was merged into this branch (conflicts in the models, `en.yml`, `schema.rb`, `types/index.ts`, `Modal.tsx`, `TasksScreen.tsx` and `.scss`, and the two docs files resolved; main's committed conflict markers in `docs/features/README.md` and `docs/ui-components.md` were removed, keeping every row). The comments API file now extends `ApiResource`, and the members hook and role helpers come from `api/workspaceMembers` and `data/workspace`. The merged result was only checked offline (`all.sh`, `ruby -c`); run the checks in steps 1 and 2 on it. If more is merged to main first, `schema.rb` (add both tables, keep the highest `version:`), `docs/features/README.md` (one row) and `TasksScreen.tsx` (the `CommentsButton` in the card actions and row actions) are the likely conflicts.

**Choices for Alex**: viewers can read but not comment; only the author edits; an admin or owner can delete anyone's comment; replies are one level deep; mentions are recorded but nobody is notified until the notifications inbox exists; the UI says "Comments", not "Updates"; no comment counts on rows.
