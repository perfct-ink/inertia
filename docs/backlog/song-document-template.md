---
priority: p0
depends_on: []
---
# Song document template

## Objective

Song document template

## Current state

Not present

## Requirements / notes

Lyrics, credits (writers, producers, performers), key/BPM, versions and stems, metadata (ISRC), and a task list for that song.

## Context

Section "Requirement docs, project types, releases and recurring work" of the retired shared backlog.

Requested by Alex on 2026-10-18: write product requirement documents that turn into tasks and stay in sync both ways; support every kind of project, not only software (Alex often writes a document per song and tracks the work for a release: a song, an album, a music video); tasks can be recurring or ongoing, and those should notify the person and ask for an update.

### How other tools handle this (light research, 2026-10-18)

- **Doc to tasks, both ways**: Jira + Confluence (create issues from requirement text; issue status shows inline in the page), Notion (a page embeds a synced task database), Linear (project documents next to the project's issues), Quip (live checklists). The common pattern is that the document holds a live reference to the task, so status shown in the doc is always the task's real status.
- **Project types as templates**: Monday, Asana and ClickUp start projects from templates per kind of work (software launch, marketing campaign, event, content calendar). A template is a document skeleton plus default task lists, fields and views.
- **Music releases**: release plans are usually worked back from the release date: writing, recording, mixing and mastering, artwork, credits and metadata (ISRC per track, UPC per release), distributor upload, streaming-editorial pitch (Spotify for Artists asks for at least 7 days before release, and earlier is better), music video, promo and social posts, then post-release follow-up. One song can belong to several releases (single, then album).
- **Recurring and ongoing work**: Asana and Todoist repeat a task on a schedule (every week, the 1st of the month, N days after completion). Basecamp's automatic check-ins ask a person a question on a schedule ("What did you work on this week?"); Monday's update requests ask an owner for a status. An ongoing task never completes; it is checked in on.

## Acceptance criteria

- Song document template works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
