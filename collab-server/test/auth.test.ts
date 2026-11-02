// Whether a collaboration connection may edit comes from Rails' `can_edit`
// (see src/auth.ts). Anything but an explicit true must be read-only.
import { describe, expect, it } from "vitest";
import { isReadOnly } from "../src/auth.js";

describe("isReadOnly", () => {
  it("lets a user Rails says can edit write", () => {
    expect(isReadOnly({ can_edit: true })).toBe(false);
  });

  it("opens the connection read-only when Rails says the user cannot edit", () => {
    expect(isReadOnly({ can_edit: false })).toBe(true);
  });

  it("fails closed when Rails does not say", () => {
    expect(isReadOnly({})).toBe(true);
    expect(isReadOnly({ can_edit: undefined })).toBe(true);
  });
});
