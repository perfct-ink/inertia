// Saving must use the token of someone who may edit, never the token of the
// latest read-only visitor (Rails would refuse it and the edits would be lost).
import { beforeEach, describe, expect, it } from "vitest";
import { editorToken, forgetEditors, rememberEditor } from "../src/editors.js";

describe("editor tokens", () => {
  beforeEach(() => {
    forgetEditors("document-1");
    forgetEditors("document-2");
  });

  it("has no token for a room nobody who may edit has joined", () => {
    expect(editorToken("document-1")).toBeUndefined();
  });

  it("keeps the latest editor's token for the room", () => {
    rememberEditor("document-1", "first");
    rememberEditor("document-1", "second");
    expect(editorToken("document-1")).toBe("second");
  });

  it("keeps rooms apart and forgets a room when it is dropped", () => {
    rememberEditor("document-1", "a");
    rememberEditor("document-2", "b");
    forgetEditors("document-1");
    expect(editorToken("document-1")).toBeUndefined();
    expect(editorToken("document-2")).toBe("b");
  });
});
