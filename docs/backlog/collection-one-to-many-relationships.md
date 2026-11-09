---
priority: p0
depends_on: [collection-field-types]
branch: backlog/collection-one-to-many-relationships
status: incomplete
components: [frontend, backend]
---
# One-to-many relationships

## Objective

**One-to-many relationships**: a relation field can hold many records, and the related collection shows the reverse list automatically (an Album shows its Songs when each Song links to the Album)

## Current state

Relation is one record per cell; no reverse view

## Requirements / notes

Default: a `many` option on relation fields plus an automatic, read-only back-reference column. Later: lookup and rollup fields (count, sum) across the link.

## Context

Section "Collections: field types, relationships, import" of the retired shared backlog.

Requested by Alex on 2026-10-18: tables should be called **Collections**; collections need many field types (see Alex's [kriogenx0/jandi](https://github.com/kriogenx0/jandi)); multiple images should be an option; collections should show one-to-many relationships; and you should be able to import YAML or JSON into a collection.

**Today**: a table document (`doc_type: table`) has fields with `data_type` in `TableField::DATA_TYPES` = text, integer, number, boolean, date, datetime, relation. Each type is validated in `TableCell`. A relation cell points at one record in another table in the same Space (many-to-one); nothing shows the other direction. Import exists only for Quip.

**What jandi has** (`jandi.js`, `jandi-form.js`, checked 2026-10-18): validators for required, empty, person name, alphanumeric, email, phone, password, strict password, credit card (Visa, Mastercard, Amex, Discover, Diners Club, JCB) and CVV; formatters for number, number with commas, money, mileage, phone (plain and with parentheses), VIN and credit card; form field types name, username, email, month, year, card year and CVV. Each type pairs validation with formatting, which matches how Inertia already checks each `data_type`.

## Acceptance criteria

- One-to-many relationships works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.

## Blocked
Implemented on `backlog/collection-one-to-many-relationships` (see `docs/features/collection_relationships.md`). Lookup and rollup fields are not built. Not run (no gems, DB or node_modules offline): `rails test`, `rails db:migrate` (then diff `db/schema.rb`, edited by hand; migration 20261019000028), `npm run lint`, type-check, Jest.

## Waiting on collection-field-types (2026-11-08)
This 2026-10-19 branch adds a many-record relation field type to `TableField` / `TableCell` / `TableEditor.tsx` / `api/tables.ts`, the same code the p0 `collection-field-types` branch rewrites (`FieldType`, `data/fieldType.ts`, `FieldCell.tsx`). It is about 350 commits behind `main` and its migration `20261019000028` predates the newest ones, so it is rebased and finished after `collection-field-types` merges: the many-record relation becomes a `LINKED` entry in `FieldType` and `FIELD_TYPES`, with its own vector rows. `depends_on` now names it so the order is picked up. `import-yaml-or-json-into-collection` depends on this task (nested lists become related Collections).
