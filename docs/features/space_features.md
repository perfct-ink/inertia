# Choose which features a Space uses

## What it does
Each Space shows only the optional sections it uses: Events, Epics, Initiatives, Milestones, Sprints, OKRs, Roadmap and Hierarchy. Documents, sheets, Collections, tasks, projects and the other sections are always on.
- **New Space** (Spaces menu → New space) asks for a name and shows a checklist of those sections, all ticked.
- **Space settings**: Spaces menu → Features shows the same checklist for the current Space. Owners and admins can change it and Save; other roles see it read-only.
- A section that is off disappears from the sidebar rail. Nothing is deleted, and turning it back on shows it again with its data. Existing Spaces keep everything on.

## API and models
`workspaces.features` (JSON, null means all). `Workspace::FEATURES` lists the keys; `enabled_features` and `feature_enabled?` read it; unknown keys are rejected (422). `POST /api/v1/workspaces` and `PATCH /api/v1/workspace` take `workspace[features][]` (update needs owner or admin); the workspace JSON always returns the enabled list in canonical order. Frontend: `data/workspaceFeature.ts` (`featureOn`, `toggleFeature`), `components/workspace/{FeatureChecklist,WorkspaceFeatures,NewWorkspaceDialog}.tsx`, the rail in `file-manager/Sidebar.tsx`.

## Who can view and change
Anyone in the Space sees the effect; owners and admins change it. The personal Space can be changed by its owner too.

## Tests
`backend/test/models/workspace_features_test.rb`, `backend/test/controllers/workspace_features_controller_test.rb`, `frontend/src/data/workspaceFeature.test.ts`, `frontend/src/components/workspace/WorkspaceFeatures.test.tsx`.

## Known limits
- Only the sidebar rail is filtered. Direct URLs (`/sprints`, `/okrs`, ...) still open, and "quick add" and other places that mention these sections are unchanged; the screens do not redirect when their feature is off.
- Newer sections (Releases, Ideas, Objectives map, Inbox, My work) are always on; add keys to `Workspace::FEATURES` and `data/workspaceFeature.ts` together to make them optional.
- The GettingStarted checklist still creates a Space by name only (all features on).

## History
- Implemented 2026-10-19 on branch `backlog/choose-which-features-a-space-uses`. Not merged or deployed.
- Not verified: migration, Rails tests, lint, type-check, frontend tests and the browser did not run (no database, no node_modules); `schema.rb` edited by hand. Only `ruby -c` passed.
