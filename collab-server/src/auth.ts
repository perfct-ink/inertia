// Delegates BOTH authentication and authorization to Rails — this service
// verifies nothing about the JWT itself and holds no secret of its own. A
// document room asks `GET /api/v1/documents/:id`, a folder room asks
// `GET /api/v1/folders/:id/access`; a 200 means the token is valid AND the
// user may open that document or folder, either as a member of its Space or
// through an invitation to a folder it is in (see FolderCollaboration in the
// backend); anything else rejects. So a user who cannot read something in the
// API cannot join its room, and any future change to Rails' access rules is
// inherited here with no collab-server code change.
//
// Reading is not editing: Rails also says whether the user may EDIT the
// document (`can_edit`: a Space viewer, or someone invited to a folder as a
// viewer or commenter, may not). Those connections are opened read-only, so
// Hocuspocus drops every update they send instead of broadcasting and storing
// it. Rails must be deployed before this service for `can_edit` to exist; until
// then everyone is read-only (it fails closed). Folder rooms hold no content, so
// every connection to one is read-only.
import type { onAuthenticatePayload } from "@hocuspocus/server";
import { rememberEditor } from "./editors.js";
import { parseRoom } from "./rooms.js";

const RAILS_INTERNAL_URL = process.env.RAILS_INTERNAL_URL ?? "http://backend:3000";

interface RailsDocument {
  id: number;
  title: string;
  doc_type: "document" | "spreadsheet" | "table";
  content: Record<string, unknown>;
  can_edit?: boolean;
}

// Fails closed: anything but an explicit `can_edit: true` is read-only.
export function isReadOnly(doc: Pick<RailsDocument, "can_edit">): boolean {
  return doc.can_edit !== true;
}

async function fetchFromRails<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${RAILS_INTERNAL_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Rails returned ${res.status}`);
  return res.json() as Promise<T>;
}

export interface AuthContext {
  token: string;
  documentId: string;
  initialContent: Record<string, unknown>;
}

export async function onAuthenticate({ token, documentName, connectionConfig }: onAuthenticatePayload): Promise<AuthContext> {
  if (!token) throw new Error("Unauthorized: no token");

  // Room name convention: `document-${id}` / `folder-${id}` — see rooms.ts.
  const room = parseRoom(documentName);
  if (!room) throw new Error("Unknown room");

  if (room.kind === "folder") {
    try {
      await fetchFromRails(`/api/v1/folders/${room.id}/access`, token);
    } catch {
      throw new Error("Unauthorized");
    }
    connectionConfig.readOnly = true;
    return { token, documentId: room.id, initialContent: {} };
  }

  let doc: RailsDocument;
  try {
    doc = await fetchFromRails<RailsDocument>(`/api/v1/documents/${room.id}`, token);
  } catch {
    // Collapses Rails' 401 (bad/expired token) and 403/404 (no access to
    // it, or doesn't exist) into one rejection — the client doesn't need to
    // distinguish them, it just can't connect either way.
    throw new Error("Unauthorized");
  }

  if (doc.doc_type !== "document") {
    // Spreadsheets never open a collaboration session (SpreadsheetEditor.tsx
    // has its own independent save path) — reject defensively in case a
    // client ever tries.
    throw new Error("Not a collaborative document");
  }

  connectionConfig.readOnly = isReadOnly(doc);
  // Saving uses a token that may write (see editors.ts).
  if (!connectionConfig.readOnly) rememberEditor(documentName, token);

  // Returned here, this becomes `context` for onLoadDocument (this
  // connection). See persistence.ts.
  return { token, documentId: room.id, initialContent: doc.content };
}
