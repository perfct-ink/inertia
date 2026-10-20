---
priority: p0
depends_on: []
branch: backlog/local-task-file-initiative-and-milestone-levels
status: incomplete
---
# Local `.inertia-tasks` file format gains Initiative + Milestone levels

## Objective

Local `.inertia-tasks` file format gains Initiative + Milestone levels

## Current state

File format has Epics, Sprints, Milestones (via Events)

## Requirements / notes

Open question carried over from `project-management-features.md`. Default: hosted first, file format follows.

## Context

Section "Planning hierarchy" of the retired shared backlog.

The model Alex asked for: a hierarchy of work, with every level able to sit under a Milestone.

```
Milestone                 (target date, rollup of everything under it)
└── Initiative            (strategic theme, spans multiple epics)
    └── Epic              (exists today)
        └── Task          (exists today)
            └── Subtask   (exists today, any depth via tasks.parent_id)

Roadmap = a view over Initiatives + Epics, grouped by Milestone and laid out on a time axis.
```

Default chosen for this backlog: Milestone is the top-level container, and each lower level carries an optional `milestone_id`. A task with no milestone of its own inherits its epic's, an epic inherits its initiative's. That lets a single loose task belong to a milestone without forcing an initiative and epic around it, which matches how Monday lets any item link to a milestone via Connect Boards.

## Acceptance criteria

- Local `.inertia-tasks` file format gains Initiative + Milestone levels works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Done on `backlog/local-task-file-initiative-and-milestone-levels` (see `docs/features/local_task_file_planning.md`): the `.inertia-tasks` format and `InertiaCore` model hold Milestone > Initiative > Epic > Task (optional `milestones` and `initiatives` arrays, `milestone_id`, `initiative_id`, inheritance, progress, cascade on delete, validation), checked against the backend on 2026-11-07 and brought up to the hosted API's columns (`horizon`, `position`, `folder_id`).

Decisions (Alex can change them):
- The task is the file format and model. The acceptance lines that say "in the web app" are template text: the web app (and the Mac online mode, which is the web app in a WKWebView) already has the Initiatives and Milestones pages. Editing screens in the local editor are a separate task: `docs/backlog/local-task-file-planning-screens.md`.
- Version stays 4 and the arrays are omitted when empty, so files that do not plan keep opening in earlier builds.
- This file stays because the checks below could not all run.

Ran: `cd macos && swift build --disable-sandbox --target InertiaCore -Xswiftc -warnings-as-errors` (passes), and all four test files (`PlanningLevelsTests`, `TaskFileTests`, `SharedEntityTests`, `RequestsTests`) against a small XCTest stand-in (all pass).

Not run (XCTest and full Xcode are not installed here): `swift test`, the SwiftUI app target. To verify on a Mac with Xcode:

```sh
cd macos && swift test
make mac-build
```
