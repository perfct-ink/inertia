// Room names come from the client, so only the two exact shapes are accepted
// and the id is digits only (it ends up in a Rails URL).
import { describe, expect, it } from "vitest";
import { parseRoom } from "../src/rooms.js";

describe("parseRoom", () => {
  it("reads a document room and a folder room", () => {
    expect(parseRoom("document-12")).toEqual({ kind: "document", id: "12" });
    expect(parseRoom("folder-345")).toEqual({ kind: "folder", id: "345" });
  });

  it("rejects anything else", () => {
    for (const name of ["", "document-", "document-abc", "folder-1a", "task-4", "document-1/../2", "document-1?x=1", "Document-1", " folder-1", "folder-1 ", "document--1", "document-12345678901234567890"]) {
      expect(parseRoom(name), name).toBeNull();
    }
  });
});
