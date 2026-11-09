// Which token may save a document. Rails' PATCH /documents/:id checks the
// caller's own right to edit, and a room can hold people who may only read
// (a Space viewer, or someone invited to the folder as a viewer or commenter).
// Their connections are read-only, so they never change the content, but they
// can be the connection that authenticated last. Saving with one of their
// tokens would be refused and the edits of the people who can write would not
// be stored. So the token used for saving is always an editor's: remembered
// here when an editor connects, forgotten when Hocuspocus drops the document.
const editorTokens = new Map<string, string>();

// The latest editor to connect wins, so the token is the freshest one.
export function rememberEditor(documentName: string, token: string): void {
  editorTokens.set(documentName, token);
}

// Undefined when nobody who may edit has connected to this room: there is
// nothing authorised to save.
export function editorToken(documentName: string): string | undefined {
  return editorTokens.get(documentName);
}

export function forgetEditors(documentName: string): void {
  editorTokens.delete(documentName);
}
