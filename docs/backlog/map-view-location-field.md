---
priority: p1
depends_on: []
components: [frontend]
branch: backlog/map-view-location-field
---
# Map view (location field)

## Objective

Map view (location field)

## Current state

None

## Context

Section "Views" of the retired shared backlog.

Monday board views: Table, Kanban, Gantt, Timeline, Calendar, Workload, Chart, Cards, Files Gallery, Map, Form, Pivot, Dashboard.

## Acceptance criteria

- Map view (location field) works as described in the Objective, for a signed-in member of the Space, in the web app.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked

Built on branch `backlog/map-view-location-field`, not merged. Feature doc: `docs/features/collection_map_view.md`. This file stays until the branch is merged.

**Done.** A Grid | Map switch on the Collection page. The Map plots each record whose location field holds `latitude, longitude`, with pan, zoom, keyboard control, a details card, a side list, a "not on the map" list and empty states. Frontend only: no backend change and no migration. Pure logic is in `util/geo.ts` and `data/location.ts` with tests; the component has Jest tests.

**Decisions for Alex (the conservative version was built).**
- *Location field.* There is no location type on `main`; the open branches `backlog/collection-field-types` and `backlog/contact-location-and-link-fields` add one as validated text. To stay independent of them, the map reads any **text** field holding coordinates. When a `location` type merges, add it to `locationFields` in `frontend/src/data/location.ts`. Both branches edit `frontend/src/components/editors/TableEditor.tsx` (the type list); this branch edits the same file in other places (imports, one state, a switch row and one render branch), so expect a small textual merge there.
- *Geocoding.* Addresses are not converted to coordinates, because that sends record text to an external service. Follow-up task: `docs/backlog/geocode-collection-locations.md`.
- *Base map.* No tile service is called by default; the map is a latitude/longitude grid. Pick a provider (terms, cost, attribution, key handling) and set `MAP_TILE_URL` and `MAP_TILE_ATTRIBUTION`. `frontend/webpack.config.js` already reads them; to use them in production also add `ARG`/`ENV` lines to `frontend/Dockerfile` and `build.args` entries in `docker-compose.coolify.yml`, and note it in `docs/deployment.md`. Not done here to avoid touching deploy files for an undecided service. Documented in `docs/services.md`.
- *OpenStreetMap link.* The details card links out to openstreetmap.org (a normal link; coordinates leave only on click). Remove it if Alex does not want any third-party link.

**Checks that did not run (no network, `node_modules` or Docker here).** `npm run lint` (ESLint and Stylelint), `tsc`/`npm run build`, the Jest suite (including `CollectionMap.test.tsx` and the two new `TableEditor.test.tsx` cases), and any browser check. The new component, its hook and the Sass were reviewed by hand only.

**Checks that did run.** The pure tests `frontend/src/util/geo.test.ts` (27) and `frontend/src/data/location.test.ts` (11) with the offline shim; a parse of every changed `.ts`/`.tsx` (duplicate props, unused imports, unresolved imports, undefined names); Sass compilation of `CollectionMap.scss` and `TableEditor.scss`.

**To verify and merge.**
```sh
cd frontend && npm install && npm run lint && npx tsc --noEmit && npm test
```
Then run the app (`make up`), open a Collection, add two text fields (for example Name and Location), enter `48.8584, 2.2945` and `35.6762, 139.6503` in Location, switch to **Map**, and check at 375px and on desktop, in light and dark mode: pins fit on open, drag and the zoom buttons work (with a touch screen too), arrow keys and `+`/`-` work with the map focused, selecting a pin or a list row shows the details card, a record with text like "Paris" appears under "Not on the map", and the page has no sideways scroll at 375px. To try tiles, start the dev server with `MAP_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png` for a provider you have chosen. Then merge and delete this file.
