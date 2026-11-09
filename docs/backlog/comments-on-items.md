---
priority: p2
depends_on: []
components: [backend]
branch: backlog/comments-on-items
status: incomplete
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

## Unverified

Built and pushed on `backlog/comments-on-items` (rebased onto `origin/main` as one commit on 2026-11-09), not merged: nothing here could run against a database, `node_modules` or a browser. Feature doc: `docs/features/comments.md`.

**Done**: polymorphic `comments` and `comment_mentions` tables (migration `20261108240001`, `schema.rb` hand edited), `Comment`/`CommentMention` models, `Commentable` on Task/Epic/Initiative/Milestone, `Api::V1::CommentsController` (index/create/update/destroy), `CommentBlueprint`; web UI: a comments button on task rows and Kanban cards and on epic, initiative and milestone cards opening a dialog with threads, replies, @mention suggestions, edit and delete (`components/comments/`, `api/comments.ts`, `data/comment.ts`). Added on 2026-11-09 after the notifications inbox merged: a mention notifies the mentioned person in the inbox (`comment_mention`, opens the item's page); team members can comment and be mentioned; moving a document to another Space deletes the comments on its tasks (`SpaceTransfer`); a posting spinner.

**Checks run** (offline stand-ins): `ruby -c` on every changed Ruby file; the pure data tests (`comment.test.ts`, `notification.test.ts`); the component tests `Comments.test.tsx`, `CommentsButton.test.tsx`, `MilestonesScreen.test.tsx` through the stand-in Jest; sass compile; the `/tmp/runner/all.sh` static checks.

**Checks not run**: `rails db:migrate` and the diff of `db/schema.rb`; `rails test` (`comment_test.rb`, `comments_controller_test.rb`, `space_transfer_test.rb` were only syntax checked); `npm run lint`, `tsc -b` and the real `npm test` (`TasksScreen.test.tsx` needs `@dnd-kit`); a browser look.

**To verify and merge**:
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` (expect no diff: tables `comment_mentions` and `comments`, five foreign keys, `version: 2026_11_08_240001`), then `rails test`.
2. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
3. Browser, 375px and desktop, light and dark: open the comment button on a task (backlog row and Kanban card), an epic, an initiative and a milestone; post (a spinner shows while saving), reply, type `@` and pick a member, edit, delete; sign in as the mentioned person and check the bell badge and that the inbox item opens the right page; sign in as a viewer and check the box is hidden.
4. If more is merged to main first, the likely conflicts are `backend/db/schema.rb` (add both tables, keep the highest `version:`), `docs/features/README.md` (one row) and `TasksScreen.tsx` (`CommentsButton` in the card and row actions).

**Choices for Alex**: viewers can read but not comment (writes need the member role, as for every other item); there is no per-item visibility, so everyone who can open the Space sees every item's comments; only the author edits, an admin or owner can delete anyone's; replies are one level deep; the UI says "Comments", not "Updates"; only mentions notify (not replies, or every comment on an assigned task); moving a document to another Space deletes the comments on its tasks rather than carrying names over; no comment counts on rows.
