import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { useEditor, EditorContent } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import TiptapDocument from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import CodeBlock from '@tiptap/extension-code-block'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { TextSelection } from '@tiptap/pm/state'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import Dropcursor from '@tiptap/extension-dropcursor'
import Gapcursor from '@tiptap/extension-gapcursor'
import type { Node } from '@tiptap/pm/model'
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Minus,
  Table as TableIcon,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Loader2,
  FileX,
  Image as ImageIcon,
} from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useDocument, useUpdateDocument } from '@/api/documents'
import { useCreateTask } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import TableEditor from './TableEditor'
import SpreadsheetEditor from './SpreadsheetEditor'
import Video from '@/extensions/Video'
import { WorkspaceTaskList } from '@/extensions/WorkspaceTaskList'
import { WorkspaceTaskItem } from '@/extensions/WorkspaceTaskItem'
import api from '@/lib/api'
import { useTabsStore } from '@/store/tabs'
import { useAuthStore } from '@/store/auth'

// Enforce: document always starts with a heading followed by body content
const CustomDocument = TiptapDocument.extend({ content: 'heading block*' })

function extractTitle(json: Record<string, unknown>): string {
  const first = (json.content as Node[] | undefined)?.[0] as Record<string, unknown> | undefined
  if (first?.type === 'heading') {
    const nodes = first.content as { text?: string }[] | undefined
    return nodes?.map((n) => n.text ?? '').join('').trim() || 'Untitled'
  }
  return 'Untitled'
}

function buildInitialContent(title: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: title ? [{ type: 'text', text: title }] : [],
      },
      { type: 'paragraph' },
    ],
  }
}

// Deterministic user id -> HSL hue, so the same user always gets the same
// collaboration cursor color across tabs/sessions, and different users
// visibly differ.
function colorForUserId(userId: number | undefined): string {
  const hue = ((userId ?? 0) * 137.508) % 360 // golden-angle spacing
  return `hsl(${hue}, 70%, 45%)`
}

function ToolbarBtn({
  icon,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 self-center shrink-0" />
}

export default function DocumentPage() {
  const { id: idStr } = useParams<{ id: string }>()
  const docId = Number(idStr)
  const { data: doc, isLoading } = useDocument(docId)
  const updateDocument = useUpdateDocument()
  const createTask = useCreateTask()
  const { data: workspace } = useWorkspace()
  const user = useAuthStore((s) => s.user)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const pendingRef = useRef<{ title?: string; content?: Record<string, unknown> }>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { openTab, updateTitle } = useTabsStore()

  // Real-time collaboration (doc_type 'document' only — spreadsheets have
  // their own independent save path in SpreadsheetEditor.tsx). The Y.Doc and
  // provider are memoized per docId; App.tsx's DocumentRoute remounts this
  // whole component on navigation (key={id}), since Collaboration's Y.Doc
  // binding isn't itself reactive to a changed id.
  const ydoc = useMemo(() => new Y.Doc(), [docId])
  const provider = useMemo(() => {
    if (doc?.doc_type !== 'document') return null
    return new HocuspocusProvider({
      url: process.env.COLLAB_URL ?? 'ws://localhost:1234',
      name: `document-${docId}`,
      document: ydoc,
      token: () => useAuthStore.getState().token ?? '',
    })
  }, [docId, ydoc, doc?.doc_type])

  useEffect(() => {
    return () => provider?.destroy()
  }, [provider])

  // Open/update tab when doc loads
  useEffect(() => {
    if (!doc) return
    openTab({
      id: String(doc.id),
      path: `/documents/${doc.id}`,
      title: doc.title || 'Untitled',
      docType: doc.doc_type,
    })
  }, [doc?.id, doc?.title, doc?.doc_type])

  // Always-current refs so stale closures in useEditor callbacks can read live values
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const createTaskRef = useRef(createTask)
  createTaskRef.current = createTask

  const editor = useEditor({
    extensions: [
      CustomDocument,
      Paragraph,
      Text,
      HardBreak,
      Bold,
      Italic,
      Underline,
      Strike,
      Code,
      Heading.configure({ levels: [1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5 | 6)[] }),
      BulletList,
      OrderedList,
      ListItem,
      WorkspaceTaskList,
      WorkspaceTaskItem,
      CodeBlock,
      HorizontalRule.extend({
        addCommands() {
          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setHorizontalRule: () => ({ state, dispatch }: any) => {
              const { tr, selection: { $from } } = state
              const hr = state.schema.nodes.horizontalRule.create()
              const para = state.schema.nodes.paragraph.create()
              tr.replaceSelectionWith(hr)
              const pos = tr.mapping.map($from.pos) + hr.nodeSize
              tr.insert(pos, para)
              tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
              if (dispatch) dispatch(tr)
              return true
            },
          }
        },
      }),
      TiptapImage,
      Link.configure({ openOnClick: false }),
      Video,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      // Exactly one undo mechanism must always be present — Collaboration
      // and History conflict if both are active, but the toolbar's undo/redo
      // buttons call editor.can().undo()/.redo() unconditionally, so a
      // moment with neither (e.g. mid-recreate while `provider` transitions
      // from null to a real instance once `doc` loads) throws outright.
      ...(provider ? [
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider,
          user: { name: user?.name ?? 'Anonymous', color: colorForUserId(user?.id) },
        }),
      ] : [ History ]),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? 'Untitled' : 'Start writing…',
        includeChildren: false,
      }),
      Dropcursor,
      Gapcursor,
    ],
    onUpdate: ({ editor }) => {
      const content = editor.getJSON() as Record<string, unknown>
      const title = extractTitle(content)
      // Under collaboration, Hocuspocus's onStoreDocument (collab-server/src/
      // persistence.ts) is the sole writer of `content` — PATCHing it here
      // too would race two uncoordinated writers on the same column. Title
      // isn't part of the Yjs-synced content, so it still needs this path.
      scheduleSaveRef.current(provider ? { title } : { content, title })
    },
  }, [provider])

  useEffect(() => {
    if (!editor || !doc) return
    if (doc.doc_type !== 'document') return
    // Collaborative content arrives via Yjs sync (seeded server-side from
    // this same Rails content by collab-server's onLoadDocument), not this
    // effect — calling setContent directly on a collaborative editor fights
    // the ySyncPlugin binding.
    if (provider) {
      setSaveStatus('saved')
      return
    }
    if (doc.content) {
      editor.commands.setContent(doc.content)
    } else {
      const initial = buildInitialContent(doc.title)
      editor.commands.setContent(initial)
      // Select the heading text so the user can type immediately to replace it
      const headingSize = editor.state.doc.firstChild?.nodeSize ?? 2
      editor.commands.setTextSelection({ from: 1, to: headingSize - 1 })
      editor.commands.focus()
    }
    setSaveStatus('saved')
  }, [editor, doc?.id, provider])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // Only the "leader" among currently-connected collaborators runs
  // syncTaskNodes — with real-time editing, two people finishing an
  // untagged task line within the same debounce window is a real
  // possibility, not just a single-user-across-tabs edge case, and this
  // function has no server-side locking against creating duplicate Tasks
  // for the same node. Elect the connection with the numerically lowest
  // awareness clientID; non-collaborative documents (no provider) have no
  // one to race with, so always proceed.
  function isTaskSyncLeader(): boolean {
    const awareness = provider?.awareness
    if (!awareness) return true
    const ids = [ awareness.clientID, ...awareness.states.keys() ]
    return awareness.clientID === Math.min(...ids)
  }

  // After each save, create workspace tasks for any unlinked task items in the document.
  // Reads workspace/createTask from refs so it's never stale regardless of when it's called.
  async function syncTaskNodes(currentEditor: ReturnType<typeof useEditor>) {
    if (!currentEditor || !isTaskSyncLeader()) return
    const ws = workspaceRef.current
    const allDocs = ws?.folders?.flatMap((f) => f.documents ?? []) ?? []
    const targetDocId = allDocs.find((d) => d.id === docId)?.id ?? allDocs[0]?.id
    if (!targetDocId) return

    const unlinked: { pos: number; text: string }[] = []
    currentEditor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'workspaceTaskItem' && !node.attrs.taskId && node.textContent.trim()) {
        unlinked.push({ pos, text: node.textContent.trim() })
      }
    })
    if (unlinked.length === 0) return

    for (const { pos, text } of unlinked) {
      const task = await createTaskRef.current.mutateAsync({ documentId: targetDocId, title: text, status: 'backlog' })
      // Use fresh state for each dispatch so positions remain accurate
      const node = currentEditor.state.doc.nodeAt(pos)
      if (node?.type.name === 'workspaceTaskItem' && !node.attrs.taskId) {
        currentEditor.view.dispatch(
          currentEditor.state.tr.setNodeMarkup(pos, undefined, { taskId: task.id })
        )
      }
    }
  }

  // scheduleSaveRef lets the stale onUpdate closure always call the current scheduleSave
  const scheduleSaveRef = useRef<(changes: { title?: string; content?: Record<string, unknown> }) => void>(
    () => {},
  )

  function scheduleSave(changes: { title?: string; content?: Record<string, unknown> }) {
    pendingRef.current = { ...pendingRef.current, ...changes }
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    // Capture editor reference now so the timeout always has the live editor
    const currentEditor = editor
    saveTimerRef.current = setTimeout(async () => {
      const toSave = { ...pendingRef.current }
      pendingRef.current = {}
      setSaveStatus('saving')
      try {
        await updateDocument.mutateAsync({ id: docId, ...toSave })
        setSaveStatus('saved')
        if (toSave.title) updateTitle(String(docId), toSave.title)
        syncTaskNodes(currentEditor)
      } catch {
        setSaveStatus('unsaved')
      }
    }, 1500)
  }
  scheduleSaveRef.current = scheduleSave

  async function uploadFile(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<{ url: string }>('/api/v1/uploads', form)
    return res.data.url
  }

  // Shared by the drag-and-drop handler below and the toolbar's picker
  // button — a device with no drag source (a phone/tablet, no mouse) has no
  // way to attach media at all without the latter.
  async function insertMediaFile(file: File) {
    if (!editor || !(file.type.startsWith('image/') || file.type.startsWith('video/'))) return
    const url = await uploadFile(file)
    if (file.type.startsWith('image/')) {
      editor.chain().focus().setImage({ src: url }).run()
    } else {
      editor.chain().focus().insertContent({ type: 'video', attrs: { src: url } }).run()
    }
  }

  async function handleEditorDrop(e: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files)
    if (!files.length || !editor) return
    const media = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (!media.length) return
    e.preventDefault()
    e.stopPropagation()
    for (const file of media) await insertMediaFile(file)
  }

  const mediaInputRef = useRef<HTMLInputElement>(null)
  async function handleMediaInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow picking the same file again later
    for (const file of files) await insertMediaFile(file)
  }

  if (isLoading || !editor) {
    return (
      <WorkspaceLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </WorkspaceLayout>
    )
  }

  if (doc?.doc_type === 'table') return <TableEditor doc={doc} />

  if (doc?.doc_type === 'spreadsheet') {
    return <SpreadsheetEditor docId={docId} />
  }

  if (!doc) {
    return (
      <WorkspaceLayout>
        <div className="flex-1 flex items-center justify-center">
          <FileX className="w-8 h-8 text-muted-foreground opacity-40" />
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b px-3 py-1 flex items-center gap-0.5 overflow-x-auto shrink-0">
          <ToolbarBtn
            icon={<Undo2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          />
          <ToolbarBtn
            icon={<Redo2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          />
          <Divider />
          <ToolbarBtn
            icon={<Heading1 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1 (⌘⌥1)"
          />
          <ToolbarBtn
            icon={<Heading2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (⌘⌥2)"
          />
          <ToolbarBtn
            icon={<Heading3 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3 (⌘⌥3)"
          />
          <ToolbarBtn
            icon={<Heading4 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            active={editor.isActive('heading', { level: 4 })}
            title="Heading 4 (⌘⌥4)"
          />
          <ToolbarBtn
            icon={<Heading5 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            active={editor.isActive('heading', { level: 5 })}
            title="Heading 5 (⌘⌥5)"
          />
          <Divider />
          <ToolbarBtn
            icon={<BoldIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          />
          <ToolbarBtn
            icon={<ItalicIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          />
          <ToolbarBtn
            icon={<UnderlineIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          />
          <ToolbarBtn
            icon={<Strikethrough className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          />
          <ToolbarBtn
            icon={<CodeIcon className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          />
          <Divider />
          <ToolbarBtn
            icon={<List className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          />
          <ToolbarBtn
            icon={<ListOrdered className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          />
          <ToolbarBtn
            icon={<ListChecks className="w-4 h-4" />}
            onClick={() => {
              const { state, dispatch } = editor.view
              const { workspaceTaskList, workspaceTaskItem, paragraph } = state.schema.nodes
              const node = workspaceTaskList.create(null, [
                workspaceTaskItem.create(null, paragraph.create()),
              ])
              const tr = state.tr.replaceSelectionWith(node)
              dispatch(tr)
              editor.commands.focus()
            }}
            active={editor.isActive('workspaceTaskList')}
            title="Task list"
          />
          <Divider />
          <ToolbarBtn
            icon={<Code2 className="w-4 h-4" />}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          />
          <ToolbarBtn
            icon={<Minus className="w-4 h-4" />}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          />
          <Divider />
          <ToolbarBtn
            icon={<TableIcon className="w-4 h-4" />}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            active={editor.isActive('table')}
            title="Insert table"
          />
          <ToolbarBtn
            icon={<LinkIcon className="w-4 h-4" />}
            onClick={() => {
              const url = window.prompt('URL:', editor.getAttributes('link').href ?? '')
              if (url === null) return
              if (url === '') {
                editor.chain().focus().unsetLink().run()
              } else {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            active={editor.isActive('link')}
            title="Link"
          />
          <ToolbarBtn
            icon={<ImageIcon className="w-4 h-4" />}
            onClick={() => mediaInputRef.current?.click()}
            title="Insert image or video"
          />
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleMediaInputChange}
          />
          <div className="ml-auto shrink-0 pr-2">
            {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            {saveStatus === 'unsaved' && <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />}
          </div>
        </div>

        {/* Editor area — clicking anywhere in the whitespace focuses the editor */}
        <div
          className="flex-1 overflow-y-auto cursor-text"
          onDrop={handleEditorDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('.ProseMirror')) {
              editor.commands.focus('end')
            }
          }}
        >
          <div className="max-w-3xl mx-auto py-12 px-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
