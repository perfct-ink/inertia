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

## Decision

Alex, 2026-11-09 ("If there isn't access, yes"): "Page not found" is only for an address the person cannot open. A slug link to an item in another Space that the person belongs to opens it (the app switches to that Space). Built: the server resolves the path across the Spaces the signed-in user can open (never beyond), the open Space first, then the others by id; the app switches Space and opens the item. No access and nonexistent give the same 404 and the same "Page not found" screen. No access rule changed.

## Unverified

Built on branch `backlog/hierarchical-urls` (see `docs/features/hierarchical_urls.md`): slugs on folders and documents (migration `20261108040001`), old paths kept as `PathAlias` rows (`20261108040002`), `GET /api/v1/paths`, hierarchical routes through `ItemRoute` with id paths still working and rewritten, links built from the Space tree through `usePaths`, nginx needs reviewed (no new location; a comment ties its locations to `Slug::RESERVED`, with a test), native hash routing unchanged.

Cross-Space links (2026-11-09 decision above): `PathResolver.find_across`, `GET /api/v1/paths` now answers with the item's `workspace`, `ItemRoute` switches Space through `useOpenInWorkspace`.

Ran offline only: `JEST_STUB_NET=1 /tmp/runner/all.sh` (babel parse, sass compile, `ruby -c`, pure data tests incl. `data/path.test.ts`) and the Jest stand-in for `ItemRoute.test.tsx` (14 tests, including switching Space, switching once, and the identical not-found screen), `hooks/useSwitchWorkspace.test.tsx` and the existing tests of the changed components. `ruby -c` on the new backend files and tests. `TransferDialog.test.tsx` fails only in the stand-in (its axios stub's `isAxiosError` is always false); `TasksScreen.test.tsx` was skipped (needs `@dnd-kit/core`).

Not run (no network, node_modules, database or browser). To verify:

```sh
cd backend && rails db:migrate && git diff db/schema.rb   # expect no diff
cd backend && rails db:rollback STEP=2 && rails db:migrate
cd backend && rails test test/services/slug_test.rb test/services/path_resolver_test.rb test/models/sluggable_test.rb test/controllers/paths_controller_test.rb && rails test && bundle exec rubocop
cd frontend && npm install && npm run lint && npx tsc -b && npm test
```

Then in a browser, light and dark, at 375px and desktop: open a folder and a document from the sidebar (address is `/folder/doc`), rename the document and the folder (address follows, old address redirects), move a folder, open `/documents/<id>` (rewritten to the path, `#heading` kept), open an unknown path (Page not found with a way back), create a new document (title still focuses), reload on a deep path, and a signed-out visit to a deep path (goes to login). Cross-Space: belong to two Spaces, open a slug link to a document in the other one (it switches Space, shows "Opening in <name>", lands on the item with `#heading` kept), open the same path while both Spaces hold it (the open Space wins), and open a path that exists only in a Space you are not in (identical "Page not found" to a made-up path; compare the two 404 bodies in the network tab). Also open the Electron, iOS and Mac shells once to confirm `#/folder/doc` works under the hash router. Check the backfill on a copy of production data first: it slugs existing folders and documents oldest first, and the unique indexes fail if two rows in one folder end up with the same slug.
