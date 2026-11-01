---
priority: p3
depends_on: [requirements-template]
components: [frontend]
---
# Project templates with starter documents that have content

## Objective

Make the documents a project template creates start with real content (headings, prompts and task lines) instead of being blank, by reusing the document templates.

## Current state

`docs/features/item_templates.md`: a project template creates documents and sheets that have only a title (`frontend/src/data/template.ts`, `ProjectTemplate.documents`). The document templates (Requirements Doc, PRD, Song) live on the unmerged `backlog/requirements-template` and `backlog/prd-template-that-creates-tasks` branches, so this waits for them.

## Requirements / notes

- Let a project template's document entry name a document template (for example `requirements` or `prd`) and send its content with `POST /api/v1/folders/:id/documents`, which already permits `content`. The send goes through `useCreateDocument`, whose input type gains `content` on the document template branch.
- Add templates for the other kinds of document a project starts with (meeting notes, campaign brief, run of show).
- Task lines in a starter document become Space tasks (`docs/features/document_task_lines.md`), so check that a project does not end up with the same task twice (a starter task and the same line in a document).

## Acceptance criteria

- Creating a project from a template makes documents with the template's content.
- No duplicate starter tasks.
- Failed API calls show an error to the user.
- Tests cover it; `docs/features/item_templates.md` is updated and this file is removed.
