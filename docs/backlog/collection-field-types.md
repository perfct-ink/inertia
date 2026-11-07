---
priority: p0
depends_on: []
components: [frontend, backend]
---
# More field types

## Objective

**More field types**, each with its own validation and display format. From jandi: email, phone, person name, username, alphanumeric (IDs/codes), money, number with commas, mileage, month, year. Also: long text, URL, percent, rating, single select, multi select/tags, person (Space member), color, created/updated time, auto-number

## Current state

Main has 9 stored types (text, integer, number, boolean, date, datetime, relation, file, files) plus formula. Branch `backlog/collection-field-types` (2026-10-19, untested, behind main) adds 15 value-validated types.

## Requirements / notes

Validation and formatting rules live in one place per type (data file plus model), so the editor, import and API all share them. Credit card, CVV, password and VIN from jandi are left out (Alex, 2026-11-07): a collection shouldn't store card numbers or passwords, and VIN isn't wanted.

## Decisions (groom, Alex, 2026-11-07)

- **One task, not split.** All the types in the Objective, including single and multi select, person, created/updated time and auto-number, ship as this task.
- **Type, then format.** A field has a type, and each type has the formats that fit it; most types have exactly one. Values are stored plain and shown in the grid in the field's format (for example money as `$1,250.00`, phone as `(555) 123-4567`). Where a type has more than one format, the field form offers a format picker after the type.
- **Left out:** credit card, CVV, password and VIN.

## Context

Section "Collections: field types, relationships, import" of the retired shared backlog.

Requested by Alex on 2026-10-18: tables should be called **Collections**; collections need many field types (see Alex's [kriogenx0/jandi](https://github.com/kriogenx0/jandi)); multiple images should be an option; collections should show one-to-many relationships; and you should be able to import YAML or JSON into a collection.

**Today**: a table document (`doc_type: table`) has fields with `data_type` in `TableField::DATA_TYPES` = text, integer, number, boolean, date, datetime, relation. Each type is validated in `TableCell`. A relation cell points at one record in another table in the same Space (many-to-one); nothing shows the other direction. Import exists only for Quip.

**What jandi has** (`jandi.js`, `jandi-form.js`, checked 2026-10-18): validators for required, empty, person name, alphanumeric, email, phone, password, strict password, credit card (Visa, Mastercard, Amex, Discover, Diners Club, JCB) and CVV; formatters for number, number with commas, money, mileage, phone (plain and with parentheses), VIN and credit card; form field types name, username, email, month, year, card year and CVV. Each type pairs validation with formatting, which matches how Inertia already checks each `data_type`.

## Acceptance criteria

- More field types works as described in the Objective, for a signed-in member of the Space, in the web app.
- The grid, import and API show each value in its field's format and store it plain.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
