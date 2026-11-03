---
branch: backlog/choose-which-features-a-project-uses
priority: p1
depends_on: []
components: [frontend, backend]
---
# Choose which features a project uses

## Objective

Each project turns on the features it needs, and the sidebar shows only those pages under it. Its files (documents, sheets, Collections, uploaded files) always show.

## Current state

An open project shows its files right under the project dropdown, then every page in fixed groups: Overview, All files, My work; Tasks (Tasks, Task table, Pivot, Calendar, Events); Planning (Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy); Goals (OKRs, Objectives map, Ideas); Delivery (Releases, Resources). See `SECTION_GROUPS` in `frontend/src/components/file-manager/ProjectNav.tsx` and `docs/features/projects.md`. Nothing can be turned off.

Related: `choose-which-features-a-space-uses.md` does the same for a whole Space. If both are built, a project can only turn on what its Space uses.

## Requirements / notes

- Store the choice on the project folder, e.g. a `features` JSON column on `folders` naming the enabled pages. Existing projects keep every feature on; decide (and record) which features a new project starts with.
- A project's settings (from the project dropdown and the project page) list the features with checkboxes; members who can write in the Space change them.
- The sidebar, the Projects page cards and quick add hide what's off. Turning a feature off hides it; no data is deleted, and a direct link to a hidden page still opens it.
- Works at phone width: the settings are a dialog with tap-sized checkboxes.

## Acceptance criteria

- A member can turn a project's features on and off, and the sidebar under that project shows only the enabled pages, with its files always shown.
- Existing projects show every feature until someone changes them.
- Failed API calls show an error to the user.
- Tests cover the API (permitted values, default) and the sidebar; `docs/features/projects.md` is updated and this file is removed.

## Blocked
Implemented on the branch with tests (see `docs/features/project_features.md`): a `features` JSON column on `folders`, a Features dialog from the project dropdown and the project page, the sidebar's Pages tab, quick add and the project Overview hiding what is off. Not verified here (no network, `node_modules` or database): `rails test`, `rails db:migrate` (migration `20261103070001`; `schema.rb` was edited by hand and its `version:` line left at `2026_11_03_120001`, which is newer), `npm run lint`, `npm test`, and the browser. What did run: `/tmp/runner/all.sh` static checks and the pure `data` tests, and the new and changed component tests under a stand-in Jest (stubbed axios, react-query and radix dialog).

To verify and merge: `cd backend && bundle install && rails db:migrate && rails test`, then diff `schema.rb`; `cd frontend && npm install && npm run lint && npm test`; then in a browser (375px and desktop, light and dark) open a project, choose Features... from its dropdown, turn pages off and check the Pages tab, quick add (Cmd+K) and the project Overview. Then remove this file.

Decisions for Alex: a new project starts with every page on (the conservative choice; say if it should start smaller), and "the Projects page cards" needed no change because they list only files. Reconciling with `backlog/choose-which-features-a-space-uses` (not stacked on it): see Known limits in the feature doc; the eight keys it shares are spelled the same.
