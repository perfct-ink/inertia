// Delegates BOTH authentication and authorization to Rails' existing
// `GET /api/v1/documents/:id` — this service verifies nothing about the JWT
// itself and holds no secret of its own. A 200 means the token is valid AND
// the connecting user's workspace owns this document (Rails already does
// both checks in one query: Document.joins(:folder).where(folders: {
// workspace_id: current_user.workspace.id})); anything else rejects. This
// also means any future change to Rails' document-access rules (e.g. wiring
// the Share model into access) is inherited here automatically, with no
// collab-server code change.
import type { onAuthenticatePayload } from "@hocuspocus/server";

const RAILS_INTERNAL_URL = process.env.RAILS_INTERNAL_URL ?? "http://backend:3000";

interface RailsDocument {
  id: number;
  title: string;
  doc_type: "document" | "spreadsheet" | "table";
  content: Record<string, unknown>;
}

async function fetchDocument(documentId: string, token: string): Promise<RailsDocument> {
  const res = await fetch(`${RAILS_INTERNAL_URL}/api/v1/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Rails returned ${res.status}`);
  return res.json() as Promise<RailsDocument>;
}

export interface AuthContext {
  token: string;
  documentId: string;
  initialContent: Record<string, unknown>;
}

export async function onAuthenticate({ token, documentName }: onAuthenticatePayload): Promise<AuthContext> {
  if (!token) throw new Error("Unauthorized: no token");

  // Room name convention: `document-${id}` — see the frontend's
  // HocuspocusProvider setup in DocumentPage.tsx.
  const documentId = documentName.replace(/^document-/, "");

  let doc: RailsDocument;
  try {
    doc = await fetchDocument(documentId, token);
  } catch {
    // Collapses Rails' 401 (bad/expired token) and 403/404 (not your
    // workspace, or doesn't exist) into one rejection — the client doesn't
    // need to distinguish them, it just can't connect either way.
    throw new Error("Unauthorized");
  }

  if (doc.doc_type !== "document") {
    // Spreadsheets never open a collaboration session (SpreadsheetEditor.tsx
    // has its own independent save path) — reject defensively in case a
    // client ever tries.
    throw new Error("Not a collaborative document");
  }

  // Returned here, this becomes `context` for onLoadDocument (this
  // connection) and — merged across connections as `lastContext` — for
  // onStoreDocument. See persistence.ts.
  return { token, documentId, initialContent: doc.content };
}
