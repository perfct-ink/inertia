---
priority: p0
depends_on: []
branch: backlog/local-task-file-initiative-and-milestone-levels
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

## Blocked
Format and model done on `backlog/local-task-file-initiative-and-milestone-levels` (see `docs/features/local_task_file_planning.md`). Not done: Mac app screens to edit initiatives and milestones. Not run: `swift test` (XCTest missing here) and the SwiftUI app build (needs Xcode); run `make mac-build` and `swift test` in `macos/`. The acceptance text mentions the web app, but this task is about the local file; the hosted app already has both levels.
