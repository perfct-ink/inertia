---
priority: p1
depends_on: []
branch: backlog/broken-link-handling
status: incomplete
---
# Broken-link handling when a target doc or heading is deleted

## Objective

Broken-link handling when a target doc or heading is deleted

## Requirements / notes

Show the link as broken rather than removing it.

**Decision (Alex, 2026-11-09 groom): mark broken, offer relink.** A link whose target document or heading was deleted shows struck through in the danger colour. Clicking it opens a small dialog (shared modal) saying the target is gone, with **Pick a new target** (the heading link picker) and **Remove link** (keeps the text, drops the link).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today (checked 2026-11-09): document and heading links exist through the heading link picker (`docs/features/heading_links.md`). Following a link to a deleted heading opens the document and shows "That heading is no longer in this document" after 6 s; nothing marks the link itself as broken beforehand, and a link to a deleted document isn't handled.

## Acceptance criteria

- Broken-link handling when a target doc or heading is deleted works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Cut off (2026-11-09)
The agent working this task was stopped by the daily API cost limit before it finished, and its last uncommitted edits were committed here as they were. Treat the branch as unfinished: the code may not build or pass tests, no checks were run on the last edits, and the Unverified section (what was run, what to run) is not written yet. Resume by reading `git log` and the diff against `origin/main`, finish the requirements above, then write the Unverified section.
