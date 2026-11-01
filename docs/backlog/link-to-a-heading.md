---
priority: p1
depends_on: []
components: [backend]
branch: backlog/link-to-a-heading
---
# Link to a heading

## Objective

**Link to a heading** in another document (or the same one)

## Requirements / notes

Headings need stable ids that survive edits and collaboration. Default: an `id` attribute on Tiptap heading nodes, generated once. The URL uses `#heading-slug`.

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Link to a heading works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/link-to-a-heading` (see `docs/features/heading_links.md`); not merged because the frontend and collab-server checks could not run where it was written (no network, no `node_modules`, no database).

Done: heading `id` attribute (editor and `collab-server/src/schema.ts`), ids stored with each save by one collaborator, a "Link to a heading" toolbar button and picker, in-app link clicks, scroll and highlight on arrival, error notice for a missing heading, tests, feature doc. No backend change was needed (content is JSON), so `components: [backend]` above was inaccurate.

Decisions for Alex: the link is an ordinary link mark with href `/documents/<id>#<anchor>` rather than a new node, so it does not depend on `backlog/link-to-another-document`; its text does not follow heading renames. The id is the slug of the heading's text when first stored (readable `#launch-plan`), then never changes.

Ran: `/tmp/runner/all.sh` (parse, import and identifier checks, Sass compile of changed files) and the pure `frontend/src/data/heading.test.ts` (15 pass).

Did not run: lint, type-check, Jest (`HeadingAnchor.test.ts`, `useHeadingLinks.test.tsx`, `HeadingLinkPicker.test.tsx` were written but never executed), the collab-server Vitest, the editor in a browser.

To verify and merge:

```bash
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
cd ../collab-server && npm install && npm run lint && npx tsc --noEmit && npm test
```

Then open a document at 375px and desktop, light and dark: add headings, wait two seconds, use the # toolbar button to link to a heading in this and another document, click the link (it should scroll to and highlight the heading), rename the heading and click again, and confirm a deleted heading shows the notice. Redeploy the collab server with the frontend so ids survive reseeding.
