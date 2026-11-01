# Collection map view

## What it does
A Collection page has a **Grid | Map** switch under its title (shown once the Collection has a field). **Map** plots every record whose location field holds a place as a pin.

- **Location field.** Collections have no location type yet, so a place is a *text* field holding `latitude, longitude` as decimal degrees: `48.8584, 2.2945`. A space, `;`, brackets or a `geo:` prefix also work (`parseCoordinates` in `util/geo.ts`). Latitude must be within 90 and longitude within 180. The map opens on the text field with the most places in it, then one named like a location, then the first text field. With more than one text field, a "Location field" select in the side panel switches fields; with one, the select is hidden.
- **The map.** Pins fit the map when it opens. Drag to move it, use the zoom in/out buttons, or press the arrow keys and `+`/`-` with the map focused. "Show every pin" fits them again (it is disabled while the map is already fitted). Selecting a pin, on the map or in the side list, opens a details card on the map with the record's label, its coordinates, its other filled-in values and an "Open in OpenStreetMap" link; Esc (with the map focused) or the close button dismisses it. Choosing a record in the side list also centres the map on it. A record's label is its Name or Title text field, else its first filled-in text field, else `Record #id`.
- **Side panel.** "N of M records on the map", the list of pins, and, only when some records cannot be placed, "Not on the map (N)" naming the first 10 with what their location field says, and a hint to fix them in the Grid view. On a phone the panel sits below the map, which is as wide as the screen less its margins and about 60% of the screen high; from 1024px the panel sits to the right.
- **Empty states.** No text field: "Add a text field for each record's location". A text field but no coordinates: "No record has coordinates yet".
- **Base map.** By default the map is a latitude/longitude grid with labelled lines and makes **no request to any map server**. If the build sets `MAP_TILE_URL` (an https template with `{z}`, `{x}` and `{y}`), standard 256px tiles are drawn under the pins, with `MAP_TILE_ATTRIBUTION` shown in the corner; tiles are requested with `referrerpolicy="no-referrer"`. A template that is not https or lacks a placeholder is ignored. See [services.md](../services.md).
- Pins are 44px tap targets, the controls are 40px, and every colour comes from the theme tokens, so light and dark mode both work. Hover only changes colour, never size or position.

## API and models
No backend change. The map reads the existing `GET /api/v1/tables/:id` (fields and records) through `useTable`, so a failed load shows the Collection page's existing error. Nothing is written from the map; coordinates are edited in the Grid view, and failures there show the existing record error.

## Who can view and change
Anyone who can open the Collection can use the map; it changes nothing. Editing locations follows the Grid view's existing permissions (members of the Space with write access).

## Web entry points
`/documents/:id` for a Collection (`components/editors/TableEditor.tsx`), then **Map**. Code: `components/editors/CollectionMap.tsx` and `.scss`; pure logic in `util/geo.ts` (coordinates, Web Mercator projection, fit, pan, zoom, tiles, graticule) and `data/location.ts` (location fields, pins, labels, details); `hooks/useElementSize.ts`.

## Tests
- `frontend/src/util/geo.test.ts` and `frontend/src/data/location.test.ts` (pure; run with the offline shim).
- `frontend/src/components/editors/CollectionMap.test.tsx` (pins, unplaced list, details card, list selection, zoom/pan/keyboard, field select, empty state, tiles on and off) and two cases in `TableEditor.test.tsx` (the Grid/Map switch).

## Known limits
- Addresses and place names are not turned into coordinates: that needs a geocoding service, which is a decision for Alex (`docs/backlog/geocode-collection-locations.md`). A "location" field type, a lat/lng pair of number fields and a coordinate picker are not built either; the map reads a text field so it does not depend on the unmerged `collection-field-types` and `contact-location-and-link-fields` branches. When a `location` type lands, add it to `locationFields` in `data/location.ts`.
- No base-map imagery without `MAP_TILE_URL`, and the production Docker build does not pass the two variables through yet (see the Blocked note in the backlog file). Which tile provider to use, and its terms and cost, is Alex's call.
- No clustering: pins that are close together overlap. No pinch or wheel zoom (so the page still scrolls); use the buttons. On a touch screen a drag that starts on the map moves the map, not the page; scroll from the margin or the side panel.
- The view does not wrap across the date line, and the Grid/Map choice and the map position are not remembered or in the URL.
- A Collection with thousands of records lists them all in the side panel; only pins near the screen are drawn.
- The "Open in OpenStreetMap" link sends the record's coordinates to openstreetmap.org only when someone clicks it.

## History
- Implemented 2026-11-01 (not deployed; on branch `backlog/map-view-location-field`).
- Not implemented: geocoding, a location field type, clustering, pinch zoom, remembering the view.
- Not verified: lint, type-check, the Jest suite (including the new component tests), the browser at 375px and desktop, and dark mode were not run (no dependencies installed, no network). Run: the pure tests for `util/geo.ts` and `data/location.ts` with the offline shim, and `sass` compilation of the new and changed stylesheets.
