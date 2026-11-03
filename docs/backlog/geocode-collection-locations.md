---
priority: p2
depends_on: []
components: [backend, frontend]
branch: backlog/geocode-collection-locations
---
# Geocode addresses in a Collection's location field

## Objective

Let people type an address or place name ("Eiffel Tower, Paris") into a Collection's location field and see the record on the Map view, without typing latitude and longitude.

## Current state

The Map view (`docs/features/collection_map_view.md`) plots only text values that are already `latitude, longitude`. Anything else is listed under "Not on the map".

## Context

Turning an address into coordinates needs a geocoding service. That is an external service with terms, cost, rate limits and privacy consequences (record text leaves Inertia), so the provider is Alex's decision. Candidates to compare: a self-hosted Nominatim, a hosted provider with a key, or the browser's own place search if one is acceptable. Record the choice in `docs/services.md`.

## Requirements

- Geocode on the server when a location value is saved, store the result (latitude, longitude and the matched name) beside the typed text, and never geocode on page load. Cache results so the same text is not looked up twice.
- No call is made unless the provider is configured by environment variable; without one the Map view behaves as it does now.
- A failed lookup shows an error on the record and leaves the text as typed. Values that already are coordinates skip the lookup.
- Decide with `collection-field-types` and `contact-location-and-link-fields` whether this belongs to a real `location` field type; if so, base the work on that type instead of on text fields.

## Acceptance criteria

- With a provider configured, saving an address in the location field puts the record on the Map view.
- Without one, nothing is sent anywhere.
- Backend tests stub the provider; the feature doc and `docs/services.md` are updated and this file is removed.

## Blocked

Built and pushed on branch `backlog/geocode-collection-locations`, not merged to `main`, because it needs a decision and some checks could not run here.

**Done.** A provider-abstracted backend service (`Geocoding`, with a `NullProvider` default and one Nominatim-compatible adapter) that looks an address up when a record is saved, stores the result beside the typed text, caches it per Space, and shows the result or the error on the record and on the Map view. It does nothing unless `GEOCODER_PROVIDER` and `GEOCODER_URL` are set, and a text field must also be switched on ("Look up addresses for the Map view"). `docs/services.md` and `docs/features/collection_map_view.md` describe it. It is built on text fields (the Map view's convention), not a `location` field type, because that type is not on `main`.

**Alex's decisions.**
- Which geocoding provider to use (self-hosted Nominatim, a hosted service with a key, or none), its terms, cost, rate limits and whether it may keep queries. Until then the feature stays off. The text of opted-in fields leaves the server when a record is saved (see `docs/services.md`).
- Whether geocoding should wait for a real `location` field type (`collection-field-types`, `contact-location-and-link-fields`) before it is turned on for anyone.
- Follow-up work found while building: `docs/backlog/geocode-existing-collection-records.md`.

**Did not run (no network, `node_modules`, database or Rails here).** `rails db:migrate` and the `schema.rb` diff (I edited `schema.rb` by hand; its `version:` line was left at `2026_11_03_120001`, which is newer than the new migration `20261103080001`), the whole `rails test` suite (the four new Ruby test files were only syntax-checked; `geocoding_test.rb` was run outside Rails with a small stand-in and passed; the Locator's logic was run against in-memory stand-ins), `npm run lint`, `tsc -b`, the full Jest suite, a real lookup against a real provider, and the browser.

**Ran.** `/tmp/runner/all.sh` (static checks, sass, `ruby -c`, the pure tests including the new ones in `data/location.test.ts`), the Jest suites `CollectionMap.test.tsx` (14 passed) and, with `JEST_STUB_NET=1`, `TableEditor.test.tsx` (18 passed).

**To verify and merge.**
1. `cd backend && rails db:migrate`, then diff `db/schema.rb` against the hand edit (columns `table_fields.geocode`, `table_cells.geocode`, table `geocoded_places`); `rails test` (new: `test/services/geocoding_test.rb`, `test/services/geocoding/locator_test.rb`, `test/controllers/tables_geocoding_test.rb`, `test/models/table_geocode_test.rb`; they stub the provider and the network).
2. `cd frontend && npm install && npm run lint && npx tsc -b && npm test`.
3. In a browser at 375px and desktop, light and dark: with no `GEOCODER_*` variables, the Collection field form has no lookup option and the Map view is unchanged. With `GEOCODER_PROVIDER=nominatim` and `GEOCODER_URL` pointing at a Nominatim, turn the option on for a text field, save "Eiffel Tower, Paris" in a record, and see the matched name under it, a pin on the Map, and the matched name in the pin's details. Save text no provider can find and see "No place found for this text." on the record and in "Not on the map".
4. Decide the provider, put its variables on the Coolify Rails service, and merge. Merge hazards: `backend/db/schema.rb`, `backend/config/locales/en.yml`, `docs/services.md`, `docs/features/README.md` (one row edited), `TableEditor.tsx`, `data/location.ts`.
