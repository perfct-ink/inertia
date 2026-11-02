---
priority: p2
depends_on: []
components: [backend, frontend]
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
