---
priority: p1
depends_on: []
branch: backlog/hierarchical-urls
status: incomplete
---
# Hierarchical URLs

## Objective

**Hierarchical URLs** that mirror the folder tree, e.g. `/acme/product/feature-folders/requirements`

## Requirements / notes

Default: slugs on folders and documents, unique within their parent, with the numeric id kept as a fallback so links don't break when something is renamed or moved (old paths redirect).

## Context

Section "Document linking, navigation and URLs" of the retired shared backlog.

Requested by Alex on 2026-10-13.

Today: the editor has a plain Link extension (any URL) but no picker for internal documents or headings, and headings have no stable anchors. Routes are flat ids (`/documents/:id`, `/folders/:id`, see `frontend/src/App.tsx`); there are no slugs. Opening a folder shows its contents (`FolderDetailPage.tsx`); a folder has no home document.

## Acceptance criteria

- Hierarchical URLs works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Unverified

Built on branch `backlog/hierarchical-urls` (see `docs/features/hierarchical_urls.md`): slugs on folders and documents (migration `20261108040001`), old paths kept as `PathAlias` rows (`20261108040002`), `GET /api/v1/paths`, hierarchical routes through `ItemRoute` with id paths still working and rewritten, links built from the Space tree through `usePaths`, nginx needs reviewed (no new location; a comment ties its locations to `Slug::RESERVED`, with a test), native hash routing unchanged.

Ran offline only: `JEST_STUB_NET=1 /tmp/runner/all.sh` (babel parse, sass compile, `ruby -c`, pure data tests incl. `data/path.test.ts`) and the Jest stand-in for `ItemRoute.test.tsx` and the existing tests of the changed components. `TransferDialog.test.tsx` fails only in the stand-in (its axios stub's `isAxiosError` is always false); `TasksScreen.test.tsx` was skipped (needs `@dnd-kit/core`).

Not run (no network, node_modules, database or browser). To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect no diff
cd backend && rails db:rollback STEP=2 && rails db:migrate
cd backend && rails test test/services/slug_test.rb test/models/sluggable_test.rb test/controllers/paths_controller_test.rb && rails test && bundle exec rubocop
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser, light and dark, at 375px and desktop: open a folder and a document from the sidebar (address is `/folder/doc`), rename the document and the folder (address follows, old address redirects), move a folder, open `/documents/<id>` (rewritten to the path, `#heading` kept), open an unknown path (Page not found with a way back), create a new document (title still focuses), reload on a deep path, and a signed-out visit to a deep path (goes to login). Also open the Electron, iOS and Mac shells once to confirm `#/folder/doc` works under the hash router. Check the backfill on a copy of production data first: it slugs existing folders and documents oldest first, and the unique indexes fail if two rows in one folder end up with the same slug.
