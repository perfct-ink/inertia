# Feature hierarchy, status and rollup

## What it does
A **feature** is a requirements document in a feature folder (see [feature_folders.md](feature_folders.md)). Features nest under features to any depth, and a project's page rolls them up.
- **Feature details** (a bar under the document toolbar, shown only for ordinary documents in feature folders): Parent feature, Status, Owner, Epic and Milestone.
  - *Parent feature*: any other document in a feature folder of the Space; a feature can't sit under itself or one of its own sub-features.
  - *Status*: Planned, Active or Done, or "automatic" (the default), which works it out from the tasks: no tasks is planned, all done is done, some done is active, otherwise planned.
  - *Owner*: a Space member. *Epic* and *Milestone*: planning links (an initiative link comes from the document initiative field, [document_initiative.md](document_initiative.md) once merged).
- **Rollup**: opening a folder (its Overview tab) lists its features, nested under their parents, each with status ("(auto)" when derived), owner, and done/total tasks with percent, where the counts include all sub-features' tasks. Tasks are those linked to the feature's document (`tasks.document_id`), including ones made with "Make selection a task".
Documents outside feature folders, spreadsheets and Collections are not features.

## API and models
`documents.parent_feature_id` (self FK, nullified when the parent is deleted, so sub-features become roots), `feature_status` (nullable enum planned/active/done), `feature_owner_id` (FK to users, nullified), `epic_id`, `milestone_id` (FKs, nullified); all validated to the Space (`Document`), and accepted on `PATCH /api/v1/documents/:id` and returned in the document JSON. `FeatureRollup.for(folder)` computes the nested rows; `GET /api/v1/folders/:id/features` returns them (`title`, `depth`, `tasks_count`, `done_tasks_count`, `percent`, `status`, `status_derived`, owner, epic, milestone). Frontend: `FeatureBar`, `FeatureRollup`, `data/feature.ts`, `api/documents.ts` (`useFolderFeatures`). Stacked on `backlog/feature-folder-type`.

## Who can view and change
Anyone who can edit the document sets its feature fields; anyone who can open the folder sees the rollup.

## Tests
`backend/test/models/feature_rollup_test.rb`, `backend/test/models/document_feature_test.rb`, `backend/test/controllers/folder_features_controller_test.rb`, `frontend/src/data/feature.test.ts` (stand-in runner: pass), `components/FeatureBar.test.tsx`, `components/FeatureRollup.test.tsx`.

## Known limits
- A feature must live in a folder of kind feature to appear in a rollup, and the rollup only finds features under the folder it is asked about; a parent feature in a different project is treated as absent (the child shows as a root).
- Tasks on the epic/milestone of a feature are not added to the feature's counts; only tasks linked to the document count. Epic and milestone rollups do not yet include feature tasks.
- The rollup shows only on the folder Overview; the Portfolio and Roadmap do not list features. Counts run one grouped query for the folder, but there is no paging.
- Reparenting is by menu on the document (no drag in the tree), and the sidebar does not show features nested.

## History
- Implemented 2026-10-19 on branch `backlog/feature-hierarchy`, stacked on `backlog/feature-folder-type` (covers feature-hierarchy, link-features-to-planning-hierarchy, feature-status-and-owner and project-folder-rollup). Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, component tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand.
