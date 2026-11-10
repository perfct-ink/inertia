---
priority: p2
depends_on: [plugin-system]
components: [macos, backend]
---
# Apple Radar plugin: keep tasks in sync with Radar

## Objective
Alex (2026-11-10): a plugin that keeps Inertia tasks in sync with Apple Radar.

## Requirements
- **Two-way, run locally** (Alex, 2026-11-10). The plugin runs on the user's own Mac, using their Radar access, never from the server, and no Radar credentials are stored in Inertia.
- A task can be linked to a Radar (by Radar number); a task with no link can create one on request. Linked fields: title, status, assignee, priority, and comments.
- Radar changes update the task and task changes update the Radar. Define a status mapping in the plugin settings and say which side wins on a conflict (default: the most recent change, noted in the task's status history).
- Optionally pull in Radars the user owns as new tasks in a chosen project.
- Shows the last sync time and any error on the task and on the Plugins page.

## Open questions (groom next)
- Which Radar interface is available on the Mac (app, CLI or API) and whether it is allowed for this use.
- Which fields beyond the list above must sync.

## Acceptance criteria
- Changing a linked Radar's status updates the task, and the reverse, within one sync cycle.
- A failed sync shows an error and never loses a change on either side.
- Tests cover the status mapping and conflict rule with a fake Radar client; `docs/features/` is updated and this file is removed.
