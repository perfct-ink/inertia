---
priority: p0
depends_on: []
components: [frontend, backend]
---
# Rename Tables to Collections

## Objective

**Rename Tables to Collections** everywhere users see it: "New collection", "Documents, Sheets & Collections", "Untitled Collection", the type label in the editor, docs

## Current state

UI says Table (`FolderItem.tsx`, `FolderDetailScreen.tsx`, `TableEditor.tsx`)

## Requirements / notes

Decision, same rule as Spaces: the code, API and DB keep `table`.

## Context

Section "Collections: field types, relationships, import" of the retired shared backlog.

Requested by Alex on 2026-10-18: tables should be called **Collections**; collections need many field types (see Alex's [kriogenx0/jandi](https://github.com/kriogenx0/jandi)); multiple images should be an option; collections should show one-to-many relationships; and you should be able to import YAML or JSON into a collection.

**Today**: a table document (`doc_type: table`) has fields with `data_type` in `TableField::DATA_TYPES` = text, integer, number, boolean, date, datetime, relation. Each type is validated in `TableCell`. A relation cell points at one record in another table in the same Space (many-to-one); nothing shows the other direction. Import exists only for Quip.

**What jandi has** (`jandi.js`, `jandi-form.js`, checked 2026-10-18): validators for required, empty, person name, alphanumeric, email, phone, password, strict password, credit card (Visa, Mastercard, Amex, Discover, Diners Club, JCB) and CVV; formatters for number, number with commas, money, mileage, phone (plain and with parentheses), VIN and credit card; form field types name, username, email, month, year, card year and CVV. Each type pairs validation with formatting, which matches how Inertia already checks each `data_type`.

## Acceptance criteria

- Rename Tables to Collections works as described in the Objective, for a signed-in member of the Space, in the web app.
- Anything stated in Requirements / notes (including any named default) is implemented or deliberately changed with the reason recorded.
- Failed API calls show an error to the user.
- Tests cover the new behaviour; a feature doc in `docs/features/` is written (or the existing one updated) and this file is removed.
