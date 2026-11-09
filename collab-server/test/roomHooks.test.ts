// A folder room relays "changed" to everyone in it; nothing else is relayed,
// and document rooms never relay stateless messages.
import { describe, expect, it, vi } from "vitest";
import { editorToken, rememberEditor } from "../src/editors.js";
import { FOLDER_CHANGED, afterUnloadDocument, onStateless } from "../src/roomHooks.js";

describe("onStateless", () => {
  it("broadcasts a fixed word to the folder room", () => {
    const broadcastStateless = vi.fn();
    onStateless({ documentName: "folder-7", document: { broadcastStateless } });
    expect(broadcastStateless).toHaveBeenCalledTimes(1);
    expect(broadcastStateless).toHaveBeenCalledWith(FOLDER_CHANGED);
  });

  it("ignores document rooms and unknown rooms", () => {
    const broadcastStateless = vi.fn();
    onStateless({ documentName: "document-7", document: { broadcastStateless } });
    onStateless({ documentName: "whatever", document: { broadcastStateless } });
    expect(broadcastStateless).not.toHaveBeenCalled();
  });
});

describe("afterUnloadDocument", () => {
  it("forgets the room's saving token", () => {
    rememberEditor("document-9", "token");
    afterUnloadDocument({ documentName: "document-9" });
    expect(editorToken("document-9")).toBeUndefined();
  });
});
