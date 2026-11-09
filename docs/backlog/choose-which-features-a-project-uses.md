---
priority: p1
depends_on: []
components: [frontend, backend]
---
# Choose which features a project uses

## Objective

Each project turns on the features it needs, and the sidebar shows only those pages under it. Its files (documents, sheets, Collections, uploaded files) always show.

## Current state

An open project shows its files right under the project dropdown, then every page in fixed groups: Overview, All files, My work; Tasks (Tasks, Task table, Pivot, Calendar, Events); Planning (Roadmap, Timeline, Milestones, Initiatives, Epics, Sprints, Hierarchy); Goals (OKRs, Objectives map, Ideas); Delivery (Resources; Releases was removed 2026-11-07). See `SECTION_GROUPS` in `frontend/src/components/file-manager/ProjectNav.tsx` and `docs/features/projects.md`. Nothing can be turned off.

**Per project only** (Alex, 2026-11-09 groom): features are chosen per project, not per Space. `choose-which-features-a-space-uses.md` was merged into this task and deleted. Project types (`project-types.md`) set a new project's starting features.

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
