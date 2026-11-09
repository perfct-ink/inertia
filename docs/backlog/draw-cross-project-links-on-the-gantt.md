---
priority: p2
depends_on: []
components: [frontend, gantt]
---
# Draw cross-project links on the Gantt and in the portfolio

## Objective

Links between tasks in different projects are listed and made in a folder's dependency editor (`docs/features/task_dependencies.md`), but the chart does not draw them and nothing shows them across the Space. Show them where people plan.

## Requirements / notes

- On a folder's Gantt, draw the link to a task in another project as a stub arrow leaving or entering the bar, labelled with the other task and its project, and let the critical path follow it using the other task's dates (the server already sends them with the link).
- Decide how the browser's `planReschedule` should treat a cross-project link: today only the server does, so a drag in "Shift" mode moves tasks in other projects without the chart saying so. Show those moves (the update response lists them as `rescheduled`).
- A Space-wide list of cross-project links (for example on the Portfolio), with the ones whose dates break the link first.
- Mobile: the list must read at 375px without sideways scrolling.

## Acceptance criteria

- A link between two projects is visible on the Gantt of either project, and a move that shifts a task in another project says so.
- The Portfolio (or another Space-wide page) lists cross-project links and flags broken ones.
- Tests cover the new behaviour; the feature docs for task dependencies and the portfolio are updated and this file is removed.
