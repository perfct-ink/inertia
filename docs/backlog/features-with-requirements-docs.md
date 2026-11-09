---
priority: p0
depends_on: []
components: [backend, frontend]
branch: backlog/features-with-requirements-docs
status: incomplete
---
# Features with requirements docs

## Objective

Alex (2026-10-22): "In a space, the user should be able to create features, which are like epics. Every feature requires a requirements document. Tasks can be written in the requirements document. The user should be able to see the requirements and check off what's complete. The user should be able to collapse down the requirements to just tasks."

This task is the user-facing flow that ties the feature backlog together: create a feature in a Space, land in its requirements document, write tasks there, check them off, and fold the doc down to just its tasks.

## Requirements

1. **Create a feature from a Space.** A "New feature" action in the Space (sidebar new-item menu and the feature folder) asks for a name and creates the feature. A feature is an epic (see Decision), so it sits in the planning hierarchy under an initiative or milestone.
2. **A requirements document is required.** Creating a feature always creates its requirements document from the requirements template (`requirements-template.md`) in the same request; there is no feature without one. The server rejects a feature without a document, and the document can't be deleted or archived while the feature exists (archive or delete the feature instead, which takes the doc with it).
3. **Tasks are written in the doc.** Checklist lines in the requirements doc become Space tasks linked to the feature (the existing task lines in `docs/features/document_task_lines.md`, with `tasks.document_id` pointing at the feature's doc). No separate "add task" form is needed for the feature.
4. **See and check off.** Opening a feature opens its requirements doc with a header showing the feature's name, status and progress (done tasks / all tasks, `feature-status-and-owner.md`). Each task line has a real checkbox: checking it sets the task to `done`, unchecking sets it back, and status changes made elsewhere update the box (from `task-line-two-way-sync.md`). Progress updates without a reload.
5. **Collapse to just tasks.** A toggle on the feature folds the doc down to its task lines (headings kept as group labels, so tasks still read under the section they came from) and expands back to the full requirements. Reuse the existing "Tasks only" toggle (`document-page--tasks_only` in `view/document/DocumentScreen.scss`) rather than building a second one. Remember the choice per user per feature (local storage is fine) so a feature reopens the way it was left. Only the whole-doc toggle for now (Alex, 2026-11-09); no per-heading collapse.
6. **Design principles** (`docs/rules/design-principles.md`): works at 375px with touch-sized checkboxes and toggle; the collapse animates in 150ms or less and doesn't shift the checkbox under the cursor; the toggle and checkboxes use the shared `@/components/ui` controls; header hides progress when the feature has no tasks yet.

## Decision (Alex, 2026-10-23)

A feature is an **epic with a required requirements document**. Build it on the existing `Epic` model: add a required `document_id` to `epics` (backfill a template doc for existing epics in the migration), and call them Features in the UI the way workspaces are Spaces and tables are Collections (code, API and DB keep `epic`). Features reuse the epic rollups, roadmap, Gantt and planning hierarchy (initiative, milestone). Tasks written in the doc get `epic_id` set to the feature as well as `document_id`, so existing epic progress counts them.

This replaces the folder-flag design in `feature-folder-type.md` and the `parent_feature` default in `feature-hierarchy.md`; revisit those before building them.

## Clarification (Alex, 2026-11-08 groom)

- **A feature is within a project.** It is created from a project, and its requirements doc lives in that project.
- **A feature must have a requirements doc.**
- **Existing epics become features** (Alex, 2026-11-09): the migration gives each current epic a blank requirements doc from the template, so there is one kind.
- **A feature with tasks in it shows as an epic.** A feature with no tasks yet is just a feature (its doc); once its doc has tasks, it appears as an epic in the planning views (roadmap, Gantt, epic planning, rollups).

## Current state (checked 2026-10-22)

- Built: task lines in documents create tasks with `document_id`; a "Tasks only" toggle folds a doc to headings and task lists (`DocumentScreen.tsx`, not saved between visits).
- Not built: features themselves, the required requirements doc, a checkbox on task lines (lines show a status dot only), and a progress header.

## Acceptance criteria

- A Space member can create a feature and is taken straight to its new requirements document, built from the template.
- A feature can't exist without its requirements document (enforced by the API, covered by a model and request test).
- Checklist lines written in that doc become tasks of the feature; checking a line marks the task done and the feature's progress updates.
- The collapse toggle shows only the tasks (under their headings) and restores the full doc; the choice is remembered for that feature.
- Works in light and dark mode and at mobile width. Failed API calls show an error.
- Tests cover the new behaviour; `docs/features/` is updated (a `features.md` doc, the epic docs that mention Features, and `document_task_lines.md` for the checkbox), and this file is removed.

## Unverified

Built on `backlog/features-with-requirements-docs` and reconciled (2026-11-08) with Alex's groomed text above. Nothing here could be run against Rails, a database, a linter, the type-checker or a browser, so the branch is `incomplete`. When it merges, delete this file.

### What is built

- `epics.document_id` (migration `20261108010001_add_document_to_epics`, nullable on purpose: the previous release keeps working, and a document deleted with its folder nulls it) and the data migration `20261108010002_give_epics_requirements_documents`, which gives every epic without a document a blank one from the requirements template. The two replace the one migration of the first attempt, which did both.
- A feature is within a project: made from the open project (or the Personal Project) by "New feature" on the Features page, the project's Files toolbar and `CreateItem`. The server builds the document from the template in the same request, in the feature's folder or the Personal Project, and files the feature in that project too. A feature without a document is rejected; the document can't be deleted alone (422), taken off the feature or moved to another Space; deleting the feature deletes it and the tasks written in it.
- Tasks written in the document get the feature as their epic; the document shows a progress header (hidden until a task exists).
- Collapse: only the whole-document "Tasks only" toggle, remembered per person per feature. There is no per-heading collapse (its follow-up file was removed).
- Features page, sidebar and rail say "feature"; the rest of the UI still says "epic" (`rename-epics-to-features-in-the-ui`).

### Decisions for Alex

1. **Epics with tasks vs a bare feature.** "A feature with tasks shows as an epic in the planning views." **CONFIRMED by Alex on 2026-11-09:** the planning views list every feature, including ones with no tasks. The roadmap, Gantt/timelines, epic planning, hierarchy and rollups list **every** feature exactly as they listed epics. Nothing is hidden for having no tasks. Reasons: the epic plan page is where tasks are put into an epic (its picker and backlog pane), so hiding task-less ones would make them unplannable; the migration turns every existing epic into a feature, many with tasks assigned rather than written in a document, and others empty on purpose with dates or a milestone. A feature with no tasks already shows no progress or counts, and adds no tasks to any rollup. If you want bare features out of those views, it is a `tasks_count > 0` filter in each view; say so and it becomes its own task.
2. **Epics with no folder.** The migration files them (and their documents) in the Space's Personal Project, made if the Space has none, so the feature is within a project as you asked. The first attempt put such documents in the hidden Root instead. The cost: a Space with unfiled epics gains a "Personal Project" folder. A new feature made through the API with no project does the same.
3. **The API still accepts a plain folder outside any project** as the feature's folder (older callers and promoted ideas send one). Only the web app always files in a project.
4. The database column stays nullable (see above). A rerun of the data migration heals a feature whose document went with its folder.

### Dry run before production

The data migration writes production data (a document per epic, maybe a Personal Project per Space, and `epics.folder_id` for epics that had none). It deletes nothing, only touches epics whose `document_id` is null, and is safe to rerun. Do not try it on production first:

```sh
# 1. Preview, read-only, against a restored backup or a read replica (before the column exists):
#    epics per Space, and how many have no folder (those get a Personal Project)
psql "$SCRATCH_DATABASE_URL" -c "SELECT workspace_id, COUNT(*) AS epics, SUM(CASE WHEN folder_id IS NULL THEN 1 ELSE 0 END) AS without_folder FROM epics GROUP BY workspace_id ORDER BY workspace_id"

# 2. Restore the latest production backup into a scratch database (never production), then:
cd backend && DATABASE_URL="$SCRATCH_DATABASE_URL" RAILS_ENV=production rails db:migrate
#    The data step prints: requirements documents made: N; Personal Projects made: M; epics skipped (no Space): 0
#    N must equal the number of epics in step 1.

# 3. Check the result on the scratch database
psql "$SCRATCH_DATABASE_URL" -c "SELECT COUNT(*) FROM epics WHERE document_id IS NULL"        # expect 0
psql "$SCRATCH_DATABASE_URL" -c "SELECT COUNT(*) - COUNT(DISTINCT document_id) FROM epics"    # expect 0 (one document each)
psql "$SCRATCH_DATABASE_URL" -c "SELECT COUNT(*) FROM epics e JOIN documents d ON d.id = e.document_id WHERE d.folder_id <> e.folder_id"   # expect 0

# 4. Rerun it: it must make nothing
cd backend && DATABASE_URL="$SCRATCH_DATABASE_URL" RAILS_ENV=production rails db:migrate:redo VERSION=20261108010002
#    expect: requirements documents made: 0; Personal Projects made: 0
```

Then open a few features in the scratch app's Features page and check their documents. Production gets the migration on deploy (`db:prepare` on boot); take a backup first.

### Checks

Ran: `ruby -c` on the changed Ruby and tests, the static checker, the pure data tests, and in a Jest stand-in: `useNewFeature`, `useNewDocument`, `useTasksOnly`, `FeatureProgress`, `CreateItem`, `ProjectNav`, `SidebarRail`, `EpicsScreen`, `feature.test.ts`.

Not run (no network, node_modules, database or browser):

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # schema.rb was edited by hand (version 2026_11_08_010002 plus epics.document_id); the diff should be empty
cd backend && rails test                                   # new: test/migrations/give_epics_requirements_documents_test.rb, models/epic_test.rb, controllers/epics_controller_test.rb
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then, in a browser, light and dark, at 375px and desktop: make a feature from each entry point (Features page, project Files toolbar, `CreateItem`) with a project open and with none, and land in its document; write and tick a task and watch the header; fold to Tasks only, reload and see it remembered for that feature only; delete a feature; try to delete its document from the sidebar (it must refuse).
