---
priority: p1
depends_on: []
branch: backlog/resource-capacity-management
---
# Resource management: capacity per person, allocation to projects

## Objective

Resource management: capacity per person, allocation to projects

## Current state

Not present

## Requirements / notes

Jira doc argued against early; still P1 here because Monday has it.

## Context

Section "Portfolio, goals, resources" of the retired shared backlog.

## Acceptance criteria

- Resource management: capacity per person, allocation to projects works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built and committed on branch `backlog/resource-capacity-management`; not merged because no check that needs `node_modules`, a database or a browser could run here (`docs/rules/backlog-mode.md`). Feature doc: `docs/features/resource_management.md`.

**Done:** migrations `20261101110001` (`workspace_memberships.weekly_capacity_hours`) and `20261101110002` (`resource_allocations`), `ResourceAllocation` model, `/api/v1/resource_allocations`, capacity on the members endpoint, the `/resources` page (People and Projects tabs, eight-week window, over-capacity warnings), sidebar entry, number fields without spin buttons, tests, docs. `backend/db/schema.rb` was edited by hand.

**Ran:** `ruby -c` on every changed Ruby file; Sass compile of the new SCSS; the pure data tests (`frontend/src/data/resource.test.ts`, 21 passing) in a stand-in runner; the 7 component tests in `ResourcesScreen.test.tsx` under Jest 30 and React Testing Library from a sibling checkout, with a stand-in TypeScript stripper and stubs for `lucide-react`, the Radix dialog and `zustand` (all passed; evidence, not the project's own run).

**Did not run:** `rails db:migrate`, `rails test`, `npm run lint` (ESLint and Stylelint), the TypeScript type-check, `npm test` with the project's own Jest setup, a browser.

**To verify and merge:**
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand-edited one (both new migrations; the version line should read `2026_11_01_110002` or later) and fix any difference.
2. `cd backend && rails test` (new: `test/models/resource_allocation_test.rb`, `test/controllers/resource_allocations_controller_test.rb`, additions to `test/controllers/workspace_members_controller_test.rb`).
3. `cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test`.
4. Open `/resources` in a browser as an owner and as a plain member, at 375px and on desktop, in light and dark mode: set a capacity, allocate someone for more hours than their capacity and check the warning, edit and remove an allocation, switch to Projects, move the weeks.

**Decisions for Alex:**
- Only admins and owners can change capacities and allocations (members and viewers read). Easy to loosen in `ResourceAllocationsController` and the members endpoint if members should plan themselves.
- A part week counts in full (an allocation touching any day of a week adds all its weekly hours).
- Capacity is per Space (a `workspace_memberships` column), not one number per user across Spaces.
- It is independent of task estimates; joining it to the Workload view is `docs/backlog/workload-uses-resource-capacity.md`. Time off is `docs/backlog/resource-time-off-and-holidays.md`.

**Merge hazards:** edits the shared `Input.scss` (number spin buttons), `Sidebar.tsx` (one rail button), `App.tsx` (one route), `types/index.ts`, `api/workspaces.ts`, `workspace_members_controller.rb` (`update` accepts `weekly_capacity_hours`) and `schema.rb`. Related unmerged branches `backlog/workload-view` and `backlog/task-priority-effort-and-story-points` were not built on or changed.
