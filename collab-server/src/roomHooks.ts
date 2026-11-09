// What happens in a room besides editing text.
//
// A folder room (`folder-<id>`) has no content: the people in it show up
// through Yjs awareness, which Hocuspocus relays on its own. On top of that a
// client can tell the room "something in this folder changed" (a stateless
// message) and every other client refetches the folder. The server never
// forwards what the client sent, only a fixed word, so a message cannot carry
// anything to the others. Clients only receive it for a folder Rails let them
// join (see auth.ts), and refetching goes through the normal API checks.
import { forgetEditors } from "./editors.js";
import { parseRoom } from "./rooms.js";

export const FOLDER_CHANGED = "changed";

// Only the parts of Hocuspocus' payloads that are used, so these stay easy to
// call from a test.
interface StatelessPayload {
  documentName: string;
  document: { broadcastStateless: (payload: string) => void };
}

export function onStateless({ documentName, document }: StatelessPayload): void {
  if (parseRoom(documentName)?.kind !== "folder") return;
  document.broadcastStateless(FOLDER_CHANGED);
}

// A document is dropped from memory once the last client leaves; its saving
// token goes with it (see editors.ts).
export function afterUnloadDocument({ documentName }: { documentName: string }): void {
  forgetEditors(documentName);
}
