// No Yjs binary state is stored anywhere. Rails' `documents.content` JSON
// column stays the sole at-rest source of truth: on first connection to a
// document's room, seed the in-memory Y.Doc from Rails' JSON; on Hocuspocus's
// debounced onStoreDocument, convert back and PATCH it to Rails. Once every
// client disconnects, Hocuspocus drops the in-memory doc — the next session
// reloads fresh from Rails.
//
// IMPORTANT: Tiptap's Collaboration extension defaults to reading/writing
// the Y.XmlFragment named "default" (`field: 'default'` in
// @tiptap/extension-collaboration), NOT y-prosemirror's own default fragment
// name ("prosemirror") — the xmlFragment argument below must be passed
// explicitly on both the read and write side, or the frontend would find an
// empty fragment and Hocuspocus would never see the frontend's edits.
import * as Y from "yjs";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import type { onLoadDocumentPayload, onStoreDocumentPayload } from "@hocuspocus/server";
import { schema } from "./schema.js";
import type { AuthContext } from "./auth.js";
import { editorToken } from "./editors.js";
import { parseRoom } from "./rooms.js";

const RAILS_INTERNAL_URL = process.env.RAILS_INTERNAL_URL ?? "http://backend:3000";
const FRAGMENT = "default";

const EMPTY_DOC_JSON = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 } },
    { type: "paragraph" },
  ],
};

export async function onLoadDocument({ document, documentName, context }: onLoadDocumentPayload<AuthContext>) {
  // Folder rooms only carry who is there; they have no content to seed.
  if (parseRoom(documentName)?.kind !== "document") return;

  const fragment = document.getXmlFragment(FRAGMENT);
  if (fragment.length > 0) return; // already seeded by an earlier connection this process

  const json = context.initialContent && Object.keys(context.initialContent).length
    ? context.initialContent
    : EMPTY_DOC_JSON;

  const seeded = prosemirrorJSONToYDoc(schema, json, FRAGMENT);
  Y.applyUpdate(document, Y.encodeStateAsUpdate(seeded));
}

export async function onStoreDocument({ document, documentName }: onStoreDocumentPayload<AuthContext>) {
  const room = parseRoom(documentName);
  if (room?.kind !== "document") return;
  const documentId = room.id;

  // Saved with the token of someone who may edit (see editors.ts). When no
  // editor ever connected, only people who may read were here, their
  // connections are read-only and nothing changed: nothing to save.
  const token = editorToken(documentName);
  if (!token) return;

  const json = yDocToProsemirrorJSON(document, FRAGMENT);

  // Any editor's token is equally valid here: Rails' PATCH only checks the
  // right to edit the document, not per-field authorship, and the Yjs-merged
  // `content` is identical no matter which editor's token stamps the request.
  const res = await fetch(`${RAILS_INTERNAL_URL}/api/v1/documents/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ document: { content: json } }),
  });

  // Hocuspocus retries a failed onStoreDocument on its own debounce/unload
  // schedule, but only if the hook actually reports failure — swallowing a
  // non-2xx response here would silently drop edits.
  if (!res.ok) {
    throw new Error(`Failed to persist document ${documentId}: Rails returned ${res.status}`);
  }
}
