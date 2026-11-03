---
priority: p3
depends_on: []
components: [backend]
---
# Keep assignees who are only on a team when a document moves to another Space

## Objective

A task keeps its assignee when its document is moved or copied into a Space where that person has access only through a team.

## Requirements / notes

- `SpaceTransfer` (`backend/app/services/space_transfer.rb`) clears a task's assignee unless they have a direct membership in the target Space (`@workspace.memberships`), both when moving (`moved.where.not(assignee_id: ...)`) and when copying tasks (`member_ids`). A person who reaches the Space through a team (`Workspace#accessible_by?`, `docs/features/teams.md`) can be assigned tasks there, so they should be kept.
- Use `accessible_by?` semantics (memberships or teams), ideally one query for the target Space rather than one call per task.

## Acceptance criteria

- A moved or copied task keeps an assignee who is only on a team of the target Space, and still loses one who has no access there.
- Tests in the Space transfer controller or service tests cover both cases; `docs/features/space_transfer.md` is updated and this file is removed.
