import { Button, Input, Modal, PromptDialog } from '@/components/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { useEditor, EditorContent } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import TiptapDocument from '@tiptap/extension-document'
import { StyledParagraph } from '@/extensions/StyledParagraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Code from '@tiptap/extension-code'
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
  ListPlus,
  ListFilter,
  Code2,
  Minus,
  Table as TableIcon,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Hash,
  Loader2,
  FileX,
  Paperclip,
} from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useDocument, useUpdateDocument } from '@/api/documents'
import { markTouched } from '@/store/untouchedDocuments'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/api/tasks'
import { reconcileTitle, removedLineTaskIds } from '@/data/taskLine'
import type { Task } from '@/types'
import { useWorkspace } from '@/api/workspace'
import { uploadFile } from '@/api/uploads'
import FileViewer from '@/components/FileViewer'
import Breadcrumb from '@/components/Breadcrumb'
import DocumentOutline from '@/components/DocumentOutline'
import DocumentInitiativeBar from '@/components/DocumentInitiativeBar'
import FeatureBar from '@/components/FeatureBar'
import DocumentPlanningSummary from '@/components/DocumentPlanningSummary'
import ParagraphStylePicker from '@/components/ParagraphStylePicker'
import TableEditor from '@/components/editors/TableEditor'
import SpreadsheetEditor from '@/components/editors/SpreadsheetEditor'
import HeadingLinkPicker from '@/components/HeadingLinkPicker'
import { HeadingAnchor, assignHeadingIds, linkToHeading } from '@/extensions/HeadingAnchor'
import Video from '@/extensions/Video'
import { AudioAttachment, FileAttachment } from '@/extensions/Attachment'
import { WorkspaceTaskList } from '@/extensions/WorkspaceTaskList'
import { WorkspaceTaskItem } from '@/extensions/WorkspaceTaskItem'
import { EditorShortcuts } from '@/extensions/EditorShortcuts'
import { withoutShortcuts } from '@/extensions/withoutShortcuts'
import { replacedKeys, titleWithShortcut } from '@/data/editorShortcut'
import { insertTaskList } from '@/util/editorCommand'
import './ProseMirror.scss'
import './DocumentScreen.scss'
import { useTabsStore } from '@/store/tabs'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore } from '@/store/notifications'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useFollowDocumentLinks, useScrollToHeading } from '@/hooks/useHeadingLinks'
import { extractTitle, buildInitialContent, selectionTaskTitle, taskListContent } from '@/data/document'
import { attachmentContent, pastedFiles, uploadProblem } from '@/data/attachment'
import { colorForUserId } from '@/util/color'

// These four lose the default keys the editor's shortcut table replaces
// (data/editorShortcut.ts), so one keystroke never does two things.
const ShortcutStrike = withoutShortcuts(Strike, replacedKeys('strike'))
const ShortcutBulletList = withoutShortcuts(BulletList, replacedKeys('bulletList'))
const ShortcutOrderedList = withoutShortcuts(OrderedList, replacedKeys('orderedList'))
const ShortcutCodeBlock = withoutShortcuts(CodeBlock, replacedKeys('codeBlock'))

// Enforce: document always starts with a heading followed by body content
const CustomDocument = TiptapDocument.extend({ content: 'heading block*' })

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
    <Button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`document-toolbar_button ${active ? 'document-toolbar_button--active' : ''}`}
    >
      {icon}
    </Button>
  )
}

function Divider() {
  return <div className="document-toolbar_divider" />
}

export default function DocumentScreen() {
  const { id: idStr } = useParams<{ id: string }>()
  const docId = Number(idStr)
  const { data: doc, isLoading } = useDocument(docId)
  usePageTitle(doc?.title)
  const updateDocument = useUpdateDocument()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  // The document's own tasks, for keeping task lines and tasks the same item.
  const { data: docTasks = [], isSuccess: docTasksLoaded } = useTasks({ document_id: docId })
  const { data: workspace } = useWorkspace()
  const user = useAuthStore((s) => s.user)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [tasksOnly, setTasksOnly] = useState(false)
  // The document's content while the "Link to a heading" dialog is open (null when closed).
  const [headingLinkContent, setHeadingLinkContent] = useState<Record<string, unknown> | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const pendingRef = useRef<{ title?: string; content?: Record<string, unknown> }>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { openTab } = useTabsStore()

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
  // Same for the file inserter (defined below), which the paste handler calls.
  const insertFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {})
  const updateTaskRef = useRef(updateTask)
  updateTaskRef.current = updateTask
  const docTasksRef = useRef(docTasks)
  docTasksRef.current = docTasks
  // The title each task line and its task last agreed on, titles being saved,
  // the task ids on lines last time, and lines deleted that need a decision.
  const knownTitlesRef = useRef(new Map<number, string>())
  const pushingTitlesRef = useRef(new Map<number, string>())
  const lastLineIdsRef = useRef<Set<number> | null>(null)
  const [removedLineTasks, setRemovedLineTasks] = useState<Task[]>([])

  const editor = useEditor({
    extensions: [
      CustomDocument,
      StyledParagraph,
      Text,
      HardBreak,
      Bold,
      Italic,
      Underline,
      ShortcutStrike,
      Code,
      HeadingAnchor.configure({ levels: [1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5 | 6)[] }),
      ShortcutBulletList,
      ShortcutOrderedList,
      ListItem,
      WorkspaceTaskList,
      WorkspaceTaskItem,
      ShortcutCodeBlock,
      EditorShortcuts,
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
      AudioAttachment,
      FileAttachment,
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
    onUpdate: ({ editor, transaction }) => {
      // Typing counts; content arriving from the collaboration server doesn't.
      if (!transaction.getMeta('y-sync$')) markTouched(docId)
      const content = editor.getJSON() as Record<string, unknown>
      const title = extractTitle(content)
      // Under collaboration, Hocuspocus's onStoreDocument (collab-server/src/
      // persistence.ts) is the sole writer of `content` — PATCHing it here
      // too would race two uncoordinated writers on the same column. Title
      // isn't part of the Yjs-synced content, so it still needs this path.
      scheduleSaveRef.current(provider ? { title } : { content, title })
    },
    editorProps: {
      // Pasted screenshots and copied files are uploaded and embedded; a paste
      // that carries HTML (Word, Excel, a web page) stays text.
      handlePaste: (_view, event) => {
        const files = pastedFiles(event.clipboardData)
        if (files.length === 0) return false
        event.preventDefault()
        void insertFilesRef.current(files)
        return true
      },
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

  // A document just created from the sidebar: once the collaborative content
  // has synced, select the title so typing replaces "Untitled".
  const location = useLocation()
  const focusTitle = Boolean((location.state as { focusTitle?: boolean } | null)?.focusTitle)
  useEffect(() => {
    if (!editor || !provider || !focusTitle || doc?.doc_type !== 'document') return
    let done = false
    function focusHeading() {
      if (done || !editor) return
      done = true
      const first = editor.state.doc.firstChild
      if (first?.type.name === 'heading') editor.commands.setTextSelection({ from: 1, to: first.nodeSize - 1 })
      editor.commands.focus()
    }
    if (provider.isSynced) focusHeading()
    else provider.on('synced', focusHeading)
    return () => { provider.off('synced', focusHeading) }
  }, [editor, provider, focusTitle, doc?.doc_type])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  // Heading links ("#/documents/12#launch-plan"): scroll to the heading once the
  // editor is showing, and open links to documents without reloading the app.
  useScrollToHeading(editor, !isLoading && doc?.doc_type === 'document')
  const followDocumentLink = useFollowDocumentLinks()

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

  // Keeps each task line and its task the same item (docs/features/document_task_lines.md):
  // a line edit renames the task, a task rename changes the line, and a deleted line
  // asks whether to delete its task. Only the leader runs it, like syncTaskNodes.
  function reconcileTaskLines(currentEditor: ReturnType<typeof useEditor>, allowPush: boolean) {
    if (!currentEditor || !docTasksLoaded || !isTaskSyncLeader()) return
    const tasks = new Map(docTasksRef.current.map((t) => [t.id, t]))
    const lines: { pos: number; taskId: number; text: string; size: number; contentSize: number }[] = []
    currentEditor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'workspaceTaskItem' && node.attrs.taskId) {
        lines.push({ pos, taskId: node.attrs.taskId as number, text: node.textContent, size: node.nodeSize, contentSize: node.firstChild?.content.size ?? 0 })
      }
    })

    const pulls: { pos: number; contentSize: number; title: string }[] = []
    for (const line of lines) {
      const task = tasks.get(line.taskId)
      if (!task) continue
      const pending = pushingTitlesRef.current.get(line.taskId)
      if (pending !== undefined) {
        if (task.title === pending) pushingTitlesRef.current.delete(line.taskId)
        else continue
      }
      const result = reconcileTitle(line.text, task.title, knownTitlesRef.current.get(line.taskId))
      if (result.action === 'toTask') {
        if (!allowPush) continue
        knownTitlesRef.current.set(line.taskId, result.known)
        pushingTitlesRef.current.set(line.taskId, result.value)
        updateTaskRef.current.mutate({ id: line.taskId, title: result.value }, {
          onError: () => { pushingTitlesRef.current.delete(line.taskId); knownTitlesRef.current.delete(line.taskId) },
        })
      } else {
        knownTitlesRef.current.set(line.taskId, result.known)
        if (result.action === 'toLine') pulls.push({ pos: line.pos, contentSize: line.contentSize, title: result.value })
      }
    }
    if (pulls.length > 0) {
      // Later lines first, so earlier positions stay valid.
      const tr = currentEditor.state.tr
      pulls.sort((a, b) => b.pos - a.pos).forEach(({ pos, contentSize, title }) => {
        tr.replaceWith(pos + 2, pos + 2 + contentSize, currentEditor.state.schema.text(title))
      })
      currentEditor.view.dispatch(tr)
    }

    const current = new Set(lines.map((l) => l.taskId))
    if (lastLineIdsRef.current) {
      const removed = removedLineTaskIds(lastLineIdsRef.current, current, new Set(tasks.keys()))
      if (removed.length > 0) setRemovedLineTasks((queue) => [...queue, ...removed.map((id) => tasks.get(id) as Task)])
    }
    lastLineIdsRef.current = current
  }

  // A task renamed elsewhere changes its line (pulling only; line edits are pushed after a save).
  useEffect(() => {
    if (editor && docTasksLoaded) reconcileTaskLines(editor, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docTasks, docTasksLoaded])

  // Switching documents starts the comparison afresh.
  useEffect(() => {
    knownTitlesRef.current = new Map()
    pushingTitlesRef.current = new Map()
    lastLineIdsRef.current = null
    setRemovedLineTasks([])
  }, [docId])

  // After each save, give any heading that has text but no id its permanent id, so
  // links to it survive edits. Like task creation, only one collaborator does it.
  function syncHeadingIds(currentEditor: ReturnType<typeof useEditor>) {
    if (currentEditor && isTaskSyncLeader()) assignHeadingIds(currentEditor)
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
        await syncTaskNodes(currentEditor)
        reconcileTaskLines(currentEditor, true)
        syncHeadingIds(currentEditor)
      } catch {
        setSaveStatus('unsaved')
      }
    }, 1500)
  }
  scheduleSaveRef.current = scheduleSave

  // Uploads each file in turn and embeds it where the cursor is: an image, a
  // video or audio player, or a file card (data/attachment.ts decides which).
  // Shared by drag-and-drop, paste and the toolbar's picker button — a device
  // with no drag source (a phone/tablet, no mouse) can't attach anything
  // without the last.
  async function insertFiles(files: File[]) {
    for (const file of files) {
      const problem = uploadProblem(file)
      if (problem) {
        useNotificationStore.getState().notify(problem)
        continue
      }
      try {
        const uploaded = await uploadFile(file)
        if (!editor || editor.isDestroyed) return
        editor.chain().focus().insertContent(attachmentContent(uploaded)).run()
      } catch {
        // lib/api.ts has already shown the error; carry on with the other files.
      }
    }
  }
  insertFilesRef.current = insertFiles

  async function handleEditorDrop(e: React.DragEvent<HTMLDivElement>) {
    const files = Array.from(e.dataTransfer.files)
    if (!files.length || !editor) return
    e.preventDefault()
    e.stopPropagation()
    await insertFiles(files)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow picking the same file again later
    await insertFiles(files)
  }

  if (isLoading || !editor) {
    return (
      <WorkspaceLayout>
        <div className="view-document view-document--centered">
          <Loader2 className="document-placeholder_icon document-placeholder_icon--spinning" />
        </div>
      </WorkspaceLayout>
    )
  }

  if (doc?.doc_type === 'file') return <FileViewer doc={doc} />
  if (doc?.doc_type === 'table') return <TableEditor doc={doc} />

  if (doc?.doc_type === 'spreadsheet') {
    return <SpreadsheetEditor docId={docId} />
  }

  if (!doc) {
    return (
      <WorkspaceLayout>
        <div className="view-document view-document--centered">
          <FileX className="document-placeholder_icon document-placeholder_icon--missing" />
        </div>
      </WorkspaceLayout>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="view-document">
        <Breadcrumb folderId={doc.folder_id} title={doc.title} />

        {/* Toolbar */}
        <div className="document-toolbar">
          <ToolbarBtn
            icon={<Undo2 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          />
          <ToolbarBtn
            icon={<Redo2 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          />
          <ParagraphStylePicker editor={editor} />
          <Divider />
          <ToolbarBtn
            icon={<Heading1 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1 (⌘⌥1)"
          />
          <ToolbarBtn
            icon={<Heading2 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2 (⌘⌥2)"
          />
          <ToolbarBtn
            icon={<Heading3 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3 (⌘⌥3)"
          />
          <ToolbarBtn
            icon={<Heading4 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            active={editor.isActive('heading', { level: 4 })}
            title="Heading 4 (⌘⌥4)"
          />
          <ToolbarBtn
            icon={<Heading5 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
            active={editor.isActive('heading', { level: 5 })}
            title="Heading 5 (⌘⌥5)"
          />
          <Divider />
          <ToolbarBtn
            icon={<BoldIcon className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          />
          <ToolbarBtn
            icon={<ItalicIcon className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          />
          <ToolbarBtn
            icon={<UnderlineIcon className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          />
          <ToolbarBtn
            icon={<Strikethrough className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title={titleWithShortcut('Strikethrough', 'strike')}
          />
          <ToolbarBtn
            icon={<CodeIcon className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          />
          <Divider />
          <ToolbarBtn
            icon={<List className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title={titleWithShortcut('Bullet list', 'bulletList')}
          />
          <ToolbarBtn
            icon={<ListOrdered className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title={titleWithShortcut('Numbered list', 'orderedList')}
          />
          <ToolbarBtn
            icon={<ListChecks className="document-toolbar_icon" />}
            onClick={() => insertTaskList(editor)}
            active={editor.isActive('workspaceTaskList')}
            title={titleWithShortcut('Task list', 'taskList')}
          />
          <ToolbarBtn
            icon={<ListPlus className="document-toolbar_icon" />}
            onClick={() => {
              const { from, to, empty } = editor.state.selection
              const title = empty ? null : selectionTaskTitle(editor.state.doc.textBetween(from, to, ' '))
              if (title) editor.chain().focus().insertContentAt({ from, to }, taskListContent(title)).run()
            }}
            disabled={editor.state.selection.empty}
            title="Make selection a task"
          />
          <ToolbarBtn
            icon={<ListFilter className="document-toolbar_icon" />}
            onClick={() => setTasksOnly((v) => !v)}
            active={tasksOnly}
            title="Tasks only"
          />
          <Divider />
          <ToolbarBtn
            icon={<Code2 className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title={titleWithShortcut('Code block', 'codeBlock')}
          />
          <ToolbarBtn
            icon={<Minus className="document-toolbar_icon" />}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          />
          <Divider />
          <ToolbarBtn
            icon={<TableIcon className="document-toolbar_icon" />}
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            active={editor.isActive('table')}
            title="Insert table"
          />
          <ToolbarBtn
            icon={<LinkIcon className="document-toolbar_icon" />}
            onClick={() => setLinkDialogOpen(true)}
            active={editor.isActive('link')}
            title="Link"
          />
          <ToolbarBtn
            icon={<Hash className="document-toolbar_icon" />}
            onClick={() => setHeadingLinkContent(editor.getJSON() as Record<string, unknown>)}
            title="Link to a heading"
          />
          <ToolbarBtn
            icon={<Paperclip className="document-toolbar_icon" />}
            onClick={() => fileInputRef.current?.click()}
            title="Insert image, video, audio or file"
          />
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileInputChange}
          />
          <div className="document-status">
            {saveStatus === 'saving' && <Loader2 className="document-status_spinner" />}
            {saveStatus === 'unsaved' && <div className="document-status_dot" />}
          </div>
        </div>

        <DocumentInitiativeBar doc={doc} />
        <DocumentPlanningSummary doc={doc} />

        <FeatureBar doc={doc} />

        {/* Editor area — clicking anywhere in the whitespace focuses the editor */}
        <div
          className="document-editor_area"
          onDrop={handleEditorDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={(e) => {
            if (followDocumentLink(e)) return
            if (!(e.target as HTMLElement).closest('.ProseMirror')) {
              editor.commands.focus('end')
            }
          }}
        >
          <DocumentOutline editor={editor} />
          <div className={`document-page ${tasksOnly ? 'document-page--tasks_only' : ''}`}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      <Modal
        open={removedLineTasks.length > 0}
        title="Delete the task too?"
        description={removedLineTasks[0] ? `You removed the line for “${removedLineTasks[0].title}”. Its task is still in the Space.` : undefined}
        onClose={() => setRemovedLineTasks((queue) => queue.slice(1))}
      >
        <div className="ui-modal-actions">
          <Button variant="secondary" onClick={() => setRemovedLineTasks((queue) => queue.slice(1))}>Keep the task</Button>
          <Button
            variant="primary"
            onClick={() => {
              const [first] = removedLineTasks
              if (first) deleteTask.mutate(first.id)
              setRemovedLineTasks((queue) => queue.slice(1))
            }}
          >
            Delete the task
          </Button>
        </div>
      </Modal>
      <HeadingLinkPicker
        open={headingLinkContent !== null}
        currentDocumentId={docId}
        currentContent={headingLinkContent}
        onClose={() => { setHeadingLinkContent(null); editor.commands.focus() }}
        onPick={(picked) => { setHeadingLinkContent(null); linkToHeading(editor, picked) }}
      />
      <PromptDialog
        open={linkDialogOpen}
        title="Link"
        label="URL"
        placeholder="https://"
        initialValue={editor.getAttributes('link').href ?? ''}
        onClose={() => setLinkDialogOpen(false)}
        onSubmit={(url) => {
          if (url === '') editor.chain().focus().unsetLink().run()
          else editor.chain().focus().setLink({ href: url }).run()
        }}
      />
    </WorkspaceLayout>
  )
}
