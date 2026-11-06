---
priority: p3
depends_on: [features-with-requirements-docs]
components: [frontend]
---
# Fold a requirements document one section at a time

## Objective

A feature's requirements document can be folded to just its tasks. Let a person also fold a single section (a heading and what is under it) and see its task count when folded.

## Requirements

- A disclosure on each heading folds and unfolds the blocks up to the next heading of the same or higher level; the task lines under it stay countable ("3 tasks").
- The folded state is remembered per person per feature, with the "Tasks only" choice.
- Works with the keyboard and on a phone (touch-sized control, no hover dependence), animates in 150 ms or less and doesn't move the checkbox under the cursor.

## Acceptance criteria

- Folding a section hides its prose, keeps nothing from jumping, and survives a reload.
- Tests cover the fold logic (pure, in `data/`) and the control.
- `feature_requirements_docs.md` is updated and this file is removed.
