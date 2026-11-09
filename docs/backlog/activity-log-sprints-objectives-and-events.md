---
priority: p3
depends_on: [activity-log-per-item]
components: [backend, frontend]
---
# Activity log for sprints, objectives, key results and events

## Objective

Extend the activity log (`docs/features/activity_log.md`) to the remaining items that have their own card or row: sprints, objectives, key results and events.

## Current state

The log covers tasks, files, epics, initiatives and milestones. Each model opts in with `include Auditable` and an `audited` line, and the model name is listed in `Activity::SUBJECT_TYPES` and `ActivitySubjectType` (`frontend/src/types/index.ts`). The UI is one `ActivityButton` per card.

## Requirements

- Add `Auditable` with sensible audited fields to `Sprint`, `Objective`, `KeyResult` and `Event`; key result value changes are already kept as check-ins (`docs/features/okrs.md`, Check-in history), so log the other fields and do not duplicate the value.
- Add the new names to `Activity::SUBJECT_TYPES`, `ActivitySubjectType`, and `SUBJECT_NOUN` in `frontend/src/data/activity.ts`, plus any new field or value labels.
- Put an `ActivityButton` on the sprint, objective and event cards.

## Acceptance criteria

- Each of those items shows its log; the subject-type test still passes.
- Tests cover the new models; the feature doc is updated and this file is removed.
