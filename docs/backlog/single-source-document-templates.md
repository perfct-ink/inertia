---
priority: p3
depends_on: [features-with-requirements-docs]
components: [backend, frontend]
---
# One definition of the document templates

## Objective

The requirements template is written twice: in Ruby (`backend/app/services/requirements_template.rb`, used when a feature is made) and in TypeScript (`frontend/src/data/documentTemplate.ts`, used by the "New Requirements Doc" button). They must be edited together, which the DRY rule forbids.

## Requirements

- Keep one definition (for example the server owns the templates and serves them, or a JSON file both read) and delete the other.
- The migration `20261105010001_add_document_to_epics` keeps its own frozen copy on purpose; leave it.
- The PRD and Song templates move with it so the buttons stay consistent.

## Acceptance criteria

- Changing a template's headings changes both a new feature's document and the matching "New ..." button.
- A test fails if the two ever differ again, or the second copy is gone.
- `docs/features/document_templates.md` and `feature_requirements_docs.md` are updated and this file is removed.
