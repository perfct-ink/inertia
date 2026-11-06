# Features with requirements docs

## What it does
A **feature** is an epic with a requirements document. Users see features; code, API and database keep `epic` (the way Spaces are `workspace` and Collections are `table`).
- **Making one.** "New feature" asks for a name and creates the feature, then opens its requirements document. It is on the Features page (`/epics`), in the project's Files toolbar in the sidebar, and next to the other New buttons (`CreateItem`). With a project open the feature goes in it; with none it goes in the Personal Project, like a new document.
- **The document is required.** The server builds it in the same request, from the requirements template (Problem, Goals, User stories, Acceptance criteria, Out of scope, Tasks), titled like the feature, in the feature's folder (or the Space's root), by the person who made the feature. Every way of making an epic does this, including the API. It can't be deleted on its own (422: "Delete the feature instead"), can't be taken off the feature, can't move to another Space, and goes when the feature is deleted. Deleting a feature (after a confirmation) deletes the document and the tasks written in it; tasks that were only assigned to the feature are kept.
- **Tasks are written in the document.** Checklist lines become Space tasks (`document_task_lines.md`), and a task made in a feature's document gets that feature as its epic, so the epic's counts include it. A line has a checkbox: ticking it marks the task done, and a status change elsewhere changes the tick.
- **Progress header.** The document shows the feature's name (a link to its plan), its status (Planned, Active, Done: no tasks or none done is planned, all done is done, otherwise active) and "x of y tasks done" with a bar. The progress is hidden until the feature has a task. It follows task changes without a reload, because task changes refresh the epics.
- **Tasks only.** The header's "Tasks only" toggle (and the toolbar's, which is the same state) folds the document down to its headings and task lines and back. For a feature the choice is remembered per person in local storage, so it reopens the way it was left; other documents don't remember it.
- **Features page.** The Epics page is now called Features: "New feature", a Requirements button on each card that opens the document, and a delete that asks first. Its link in the sidebar and rail is called Features.

## API and models
- `epics.document_id` (nullable in the database, unique, foreign key to `documents` that nulls on delete). `Epic belongs_to :document`; `Document has_one :feature_epic` (`dependent: :nullify`). Migration `20261105010001_add_document_to_epics` adds the column and gives every existing epic a requirements document (in its folder, else the Space's root, made by the Space's creator, from the template as it stood).
- `Epic` builds the document before validation on create (`RequirementsTemplate.content(title)` in `backend/app/services/requirements_template.rb`); `creator` is set by `EpicsController` (otherwise the Space's creator). The document must be present on create, can't be removed later, and must be in the epic's Space. A feature whose document went with its folder keeps working with `document_id: null`.
- `Task` sets `epic_id` from the document's feature when a task is created with `document_id` and no epic.
- `Epic#destroy` destroys the document, which destroys its tasks.
- `EpicBlueprint` returns `document_id`. `POST /api/v1/epics` takes `folder_id`.
- `DocumentsController#destroy` answers 422 for a requirements document. `SpaceTransfer` refuses to move one, or a folder holding one (`FEATURE_DOCUMENT`); a copy is an ordinary document.
- Frontend: `hooks/useNewFeature.ts` (create and open), `hooks/useTargetFolder.ts` (the folder or the Personal Project; `useNewDocument` uses it too), `hooks/useTasksOnly.ts`, `components/FeatureProgress.tsx`, `data/feature.ts` (`epicFeatureStatus`, the storage key and read/write helpers), `api/epics.ts`. Task mutations now also refresh the epics.

## Who can view and change
Anyone who can write in the Space makes, renames and deletes features, like epics. The requirements document follows the usual document rules, except for the deletion, move and removal rules above.

## Web entry points
`/epics` (Features), the project's Files toolbar (`file-manager/ProjectNav.tsx`), `CreateItem`, the document page header (`view/document/DocumentScreen.tsx`).

## Tests
- `backend/test/models/epic_test.rb` (document built from the template, folder and creator, kept when given, can't be removed or cross Spaces, a feature without its document can be edited, delete takes the document and its tasks), `backend/test/models/task_test.rb` (inherits the feature), `backend/test/controllers/epics_controller_test.rb` (create, project, listing, delete, the document can't be deleted alone, tasks count towards the feature), `backend/test/services/space_transfer_test.rb`.
- `frontend/src/data/feature.test.ts`, `hooks/useNewFeature.test.tsx`, `hooks/useNewDocument.test.tsx`, `hooks/useTasksOnly.test.tsx`, `components/FeatureProgress.test.tsx`, `components/CreateItem.test.tsx`, `components/file-manager/ProjectNav.test.tsx`, `view/epics/EpicsScreen.test.tsx`.

## Known limits
- The requirements template exists twice, in Ruby (new features) and in `data/documentTemplate.ts` (the "New Requirements Doc" button); keep them in step (`docs/backlog/single-source-document-templates.md`).
- Only the Features page and the sidebar names say "feature". The plan page, roadmap, Gantt, Hierarchy, kanban, quick add and the API still say "epic" (`docs/backlog/rename-epics-to-features-in-the-ui.md`).
- Document-based features (a document in a feature folder, `feature_hierarchy.md`) still exist next to these; the two ideas need reconciling (`docs/backlog/reconcile-folder-features-with-epic-features.md`).
- The database column is nullable, so a feature can lose its document when its folder is deleted. Make it `NOT NULL` once every environment is backfilled.
- Folding a single section is not built (`docs/backlog/fold-requirements-by-section.md`).
- A task that is in the feature's document and assigned to another epic keeps that epic. A task moved into the document later isn't re-assigned.
- Deleting a project folder with features in it leaves them without a document (the folder's documents go with it); the features stay.

## History
- Implemented 2026-11-05 (not deployed; on branch `backlog/features-with-requirements-docs`). Decision from Alex (2026-10-23): a feature is an epic with a required document; the older folder-flag features stay for now.
- Not implemented: renaming epic to feature everywhere, per-section folding.
- Not verified: `rails db:migrate` (and `schema.rb`, edited by hand), `rails test`, `npm run lint`, `tsc -b`, the full Jest suite, and a browser (375px and desktop, light and dark). What ran: `ruby -c` on the changed Ruby, the Ruby template on its own, the static checker, the pure data tests, and the new and touched component and hook tests in a Jest stand-in.
