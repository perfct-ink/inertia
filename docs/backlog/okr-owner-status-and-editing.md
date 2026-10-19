---
priority: p0
depends_on: []
components: [frontend]
---
# OKRs: owner, status and editing in the UI

## Objective
Let users set an objective's owner and status and edit its title, description and key results on `/okrs`.

## Context
`/api/v1/objectives` and `/api/v1/key_results` already accept `owner_id`, `status`, title and description, but `OkrsScreen.tsx` only offers a title at creation, period dates, delete, and the current value of a number key result. Other planning pages use a Space-member owner picker (see `planning_fields.md`).

## Requirements
- Owner picker listing the Space's members, and a status picker (planned, active, done), on each objective.
- Editable objective title and description.
- Editable key result title, start, target and unit, and linked initiative.
- Use the shared UI components.

## Acceptance criteria
- Changing owner or status on a card persists and survives a reload.
- Editing a title or description persists; an empty title is rejected with an error shown.
- Editing a key result's target updates its percent.
- A failed save shows an error.
- A frontend test covers owner and status changes.
