---
priority: p3
depends_on: [geocode-collection-locations]
components: [backend, frontend]
---
# Geocode the records saved before address lookup was turned on

## Objective

When someone switches "Look up addresses for the Map view" on for a text field that already holds addresses, put those existing records on the Map view too, without making them edit each record.

## Context

`geocode-collection-locations` looks an address up when a record is saved, so records saved earlier have no stored place until they are edited. Looking up every record in one request would make the save of the field slow and could send hundreds of addresses to the provider at once.

## Requirements

- An explicit action on the field (for example "Look up existing records"), not an automatic one, that tells the person how many records will have their text sent to the provider.
- Runs in the background (a job, like the Quip import and AI runs), a few lookups at a time and slow enough for the provider's rate limits, reusing the per-Space cache (`geocoded_places`) and skipping text that is already coordinates.
- Shows progress and any failures; one failed lookup does not stop the rest, and nothing changes the typed text.
- Only members who can write to the Collection can start it.

## Acceptance criteria

- With a provider configured, starting it on a field with existing addresses puts those records on the Map view.
- Without a provider the action is not offered and nothing is sent.
- Backend tests stub the provider; the feature doc (`collection_map_view.md`) is updated and this file is removed.
