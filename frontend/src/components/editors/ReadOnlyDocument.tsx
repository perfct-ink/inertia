import { EditorContent, useEditor } from '@tiptap/react'
import { documentSchema } from '@/extensions/documentSchema'
import { sharedContent } from '@/data/share'
import './ProseMirror.scss'
import './ReadOnlyDocument.scss'

// A document's text, read-only: the editor's own schema and styles with nothing
// to type into and nothing that talks to the API (the task lines are plain).
// For people who open a share link, signed in or not.
export default function ReadOnlyDocument({ content }: { content: Record<string, unknown> | null | undefined }) {
  const doc = sharedContent(content)
  const editor = useEditor({
    extensions: documentSchema({ readOnly: true }),
    editable: false,
    content: doc ?? undefined,
    editorProps: { attributes: { 'aria-label': 'Document text, read only' } },
  }, [doc])

  if (!doc) return <p className="read_only_document-empty">This document is empty.</p>
  return <EditorContent editor={editor} className="read_only_document" />
}
