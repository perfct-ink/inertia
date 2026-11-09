// A room name says what the room is for. The frontend builds them (see
// DocumentScreen.tsx and useFolderRoom.ts):
//
//   document-<id>  live editing of one document (Yjs content, saved to Rails)
//   folder-<id>    who is in a folder right now, and a "something changed"
//                  ping for the folder's page; it never holds content
//
// The id is checked to be digits before it goes anywhere near a URL: a room
// name comes from the client, and Rails is asked about `/documents/<id>` or
// `/folders/<id>` with the user's own token.
export type RoomKind = "document" | "folder";

export interface Room {
  kind: RoomKind;
  id: string;
}

const ROOM_PATTERN = /^(document|folder)-(\d{1,18})$/;

// Null for any name that is not exactly one of the two shapes above.
export function parseRoom(documentName: string): Room | null {
  const match = ROOM_PATTERN.exec(documentName);
  return match ? { kind: match[1] as RoomKind, id: match[2] } : null;
}
