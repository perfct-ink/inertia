# Ideas (intake)

## What it does
`/ideas` (sidebar rail "Ideas") is an intake list for ideas and feature requests. Anyone in the Space submits a title and optional details; the submitter's name is kept.
- **Promote** an open idea to an epic or an initiative. The epic or initiative is created from the idea's title (an initiative also takes the description; epics have no description), the idea becomes "Promoted" and links to the Epics or Initiatives page. An idea is promoted once.
- **Decline** an open idea (it moves to the bottom), or **Reopen** a declined one. Ideas can be deleted. Open ideas list first, newest first.

## API and models
`ideas` (`workspace_id`, `submitted_by_id`, `title`, `description`, `status` open/promoted/declined, `promoted_type`, `promoted_id`). `GET/POST /api/v1/ideas`, `PATCH/DELETE /api/v1/ideas/:id` (status can only be set to open or declined by hand), `POST /api/v1/ideas/:id/promote` with `to: epic|initiative` (422 if already promoted). `Idea#promote!` does the creation in a transaction. Frontend: `api/ideas.ts`, `data/idea.ts`, `view/ideas/IdeasScreen.tsx`.

## Who can view and change
Anyone with write access to the Space (the usual `WorkspaceScoped` rule); no separate "submit only" role and no external submitters. I did not check finer role limits.

## Tests
`backend/test/models/idea_test.rb`, `backend/test/controllers/ideas_controller_test.rb`, `frontend/src/data/idea.test.ts`, `frontend/src/view/ideas/IdeasScreen.test.tsx`.

## Known limits
- No approval workflow, voting, or public intake form (Monday-style WorkForms); see `docs/backlog/project-intake-form-with-approval-workflow.md`.
- Promoting does not carry a description onto an epic, and later edits to the epic do not touch the idea.
- No owner, priority or tags on an idea.

## History
- Implemented 2026-10-19 on branch `backlog/idea-intake-promoted-to-epic-or-initiative`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
