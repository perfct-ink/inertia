---
priority: p1
depends_on: []
components: [frontend, backend]
branch: backlog/choose-which-features-a-space-uses
status: incomplete
---
# Choose which features a Space uses

## Objective

**Choose which features a Space uses** when creating or editing it, e.g. Sprints, Milestones, Initiatives, OKRs, Roadmap, Events

## Current state

Not present. `workspaces` has only name, owner, root folder and `personal`; the sidebar rail shows every section to everyone.

## Requirements / notes

Default: a `features` JSON column on `workspaces` (all on for existing Spaces), a checklist in the New Space dialog and in Space settings, and the rail, quick add and screens hide what's off. Turning a feature off hides it; no data is deleted. Owners/managers edit it.

## Context

Section "Spaces: switcher and features" of the retired shared backlog.

Requested by Alex on 2026-10-18.

## Acceptance criteria

- Choose which features a Space uses works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built 2026-11-08 on a fresh branch from main (the 2026-10-19 branch of the same name was 333 commits behind; its model, tests and checklist were ported). See `docs/features/space_features.md` for what exists and for how a project narrows the Space's list (the Space list is the default and the ceiling; a project's own list can only narrow it).

Decisions made for Alex (conservative):
- 13 optional pages, not just the six named: Events, the Planning group (Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy), the Goals group (OKRs, Objectives map, Ideas) and Resources and Workload. Tasks, Task table, Pivot, Calendar, My work, Projects, Inbox and files stay always on.
- Hiding is navigation only: the rail, the sidebar's task pages, quick add and its shortcuts, and the project overview sections. A link to a hidden page still opens it. No data is deleted.
- Admins and owners change it (the existing `PATCH /api/v1/workspace` check); members and viewers see a read-only list. Existing Spaces show every page.

Ran (offline): `ruby -c` on every changed Ruby file; the static checks, the pure data tests and the component tests for the changed files in the Jest stand-in (`JEST_STUB_NET=1 /tmp/runner/all.sh`), which includes a sass compile of `FeatureChecklist.scss`.

Not run (no network, node_modules, database or browser). To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect only workspaces.features and the version line
cd backend && rails test test/models/workspace_features_test.rb test/controllers/workspace_features_controller_test.rb test/controllers/workspaces_controller_test.rb && rails test
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser at 375px and desktop, light and dark: Space menu > Features... (as owner, then as a member: read-only), New Space... with some pages unchecked, the rail and the sidebar's task pages afterwards, Cmd+K with Events off (no tabs), and a project overview with Epics or Events off.

Merge hazards: `backend/db/schema.rb` (version line `2026_11_08_030001`); `components/file-manager/projectSections.ts`, `SidebarRail.tsx`, `ProjectNav.tsx` and `Sidebar.tsx` overlap with `backlog/choose-which-features-a-project-uses`, which must be reconciled by intersecting the two lists (see the feature doc).
