import { Button, Input } from '@/components/ui'
import { Database } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronRight, Folder, FolderKanban, FileText, TableIcon, Pin, CheckSquare, CalendarDays, MoreVertical } from 'lucide-react'
import {
  useCreateFolder, useCreateDocument, useDeleteFolder, useDeleteDocument, useUploadFiles,
  usePinFolder, usePinDocument, useUpdateFolder,
} from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import { errorMessage } from '@/api/tables'
import type { Folder as FolderType, Document } from '@/types'
import './FolderItem.scss'

// ── Context menu ─────────────────────────────────────────────────────────────

interface MenuItem { label: string; action: () => void; danger?: boolean }

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div
      ref={ref}
      className="folder_item-menu"
      style={{
        left: Math.min(x, window.innerWidth - 176),
        top: Math.min(y, window.innerHeight - items.length * 36 - 8),
      }}
    >
      {items.map((item) => (
        <Button
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          className={`folder_item-menu_item${item.danger ? ' folder_item-menu_item--danger' : ''}`}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}

// Touch equivalent of right-click: opens the exact same ContextMenu/items,
// positioned from the button's own rect instead of a mouse event. Always
// visible below md (no hover to reveal it with), hover-reveal above it —
// matching the row's existing group-hover affordances.
function ActionsButton({ onOpen }: { onOpen: (pos: { x: number; y: number }) => void }) {
  return (
    <Button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        onOpen({ x: rect.right, y: rect.bottom + 4 })
      }}
      title="More actions"
      aria-label="More actions"
      className="folder_item-actions"
    >
      <MoreVertical className="folder_item-icon--sm" />
    </Button>
  )
}

// ── Inline rename ─────────────────────────────────────────────────────────────

function InlineInput({ defaultValue, onConfirm, onCancel }: { defaultValue: string; onConfirm: (v: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <Input
      ref={ref}
      defaultValue={defaultValue}
      className="folder_item-inline_input"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) { submitted.current = true; onConfirm(e.currentTarget.value.trim()) }
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (!submitted.current) onCancel() }}
    />
  )
}

// ── FolderItem ────────────────────────────────────────────────────────────────

// Whether a drag carries files from outside the page (not an item being moved inside it).
const hasFiles = (transfer: DataTransfer) => Array.from(transfer.types).includes('Files')

export function FolderItem({ folder, depth = 0 }: { folder: FolderType; depth?: number }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const [addingFolder, setAddingFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(false)
  const [renamingDocId, setRenamingDocId] = useState<number | null>(null)
  const [folderCtx, setFolderCtx] = useState<{ x: number; y: number } | null>(null)
  const [docCtx, setDocCtx] = useState<{ x: number; y: number; doc: Document } | null>(null)
  const [actionError, setActionError] = useState('')

  const createDocument = useCreateDocument()
  const createFolder = useCreateFolder()
  const deleteFolder = useDeleteFolder()
  const deleteDocument = useDeleteDocument()
  const pinFolder = usePinFolder()
  const pinDocument = usePinDocument()
  const updateFolder = useUpdateFolder()
  const updateDocument = useUpdateDocument()
  const uploadFiles = useUploadFiles()
  const [dropTarget, setDropTarget] = useState(false)

  const indent = depth * 12
  const isProject = folder.kind === 'project'
  const FolderIcon = isProject ? FolderKanban : Folder

  async function createItem(type: Document['doc_type']) {
    setOpen(true)
    setActionError('')
    try {
      const doc = await createDocument.mutateAsync({ folderId: folder.id, title: `Untitled ${type === 'spreadsheet' ? 'Sheet' : type === 'table' ? 'Table' : 'Document'}`, doc_type: type })
      navigate(`/documents/${doc.id}`)
    } catch (error) { setActionError(errorMessage(error)) }
  }

  const folderMenuItems: MenuItem[] = [
    { label: 'New Document', action: () => createItem('document') },
    { label: 'New Sheet', action: () => createItem('spreadsheet') },
    { label: 'New Collection', action: () => createItem('table') },
    { label: 'New Subfolder', action: () => { setOpen(true); setAddingFolder(true) } },
    { label: folder.pinned ? 'Unpin' : 'Pin', action: () => pinFolder.mutate({ id: folder.id, pinned: !folder.pinned }) },
    { label: 'Rename', action: () => setRenamingFolder(true) },
    ...(folder.root ? [] : [
      { label: isProject ? 'Make Folder' : 'Make Project', action: () => updateFolder.mutate({ id: folder.id, kind: isProject ? 'folder' : 'project' }) },
      { label: 'Archive', action: () => updateFolder.mutate({ id: folder.id, archived: true }) },
      { label: 'Delete', action: () => deleteFolder.mutate(folder.id, { onError: e => setActionError(errorMessage(e)) }), danger: true },
    ]),
  ]

  return (
    <div className="view-folder_item">
      {actionError && <div role="alert" className="folder_item-error">{actionError}<Button className="folder_item-dismiss" onClick={() => setActionError('')}>Dismiss</Button></div>}
      {/* Folder row */}
      <div
        className={`folder_item-row folder_item-row--folder${location.pathname === `/folders/${folder.id}` ? ' folder_item-row--active' : ''}${dropTarget ? ' folder_item-row--drop' : ''}`}
        style={{ paddingLeft: `${8 + indent}px`, paddingRight: '8px' }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setFolderCtx({ x: e.clientX, y: e.clientY }) }}
        onDragOver={(e) => { if (hasFiles(e.dataTransfer)) { e.preventDefault(); setDropTarget(true) } }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={async (e) => {
          setDropTarget(false)
          if (!hasFiles(e.dataTransfer)) return
          e.preventDefault()
          setActionError('')
          try { await uploadFiles.mutateAsync({ folderId: folder.id, files: Array.from(e.dataTransfer.files) }); setOpen(true) } catch (error) { setActionError(errorMessage(error)) }
        }}
      >
        <Button onClick={() => setOpen((o) => !o)} className="folder_item-toggle">
          <ChevronRight className={`folder_item-chevron${open ? ' folder_item-chevron--open' : ''}`} />
        </Button>
        <FolderIcon className="folder_item-icon folder_item-icon--sm" aria-label={isProject ? 'Project' : undefined} />
        {renamingFolder ? (
          <InlineInput
            defaultValue={folder.name}
            onConfirm={(name) => { updateFolder.mutate({ id: folder.id, name }); setRenamingFolder(false) }}
            onCancel={() => setRenamingFolder(false)}
          />
        ) : (
          <Button
            onClick={() => navigate(`/folders/${folder.id}`)}
            title="Open folder — see its documents, tasks, and events"
            className="folder_item-name"
          >
            {folder.name}
          </Button>
        )}
        {folder.has_tasks && (
          <span title="Has tasks" className="folder_item-badge">
            <CheckSquare className="folder_item-icon--xs" />
          </span>
        )}
        {folder.has_events && (
          <span title="Has events" className="folder_item-badge">
            <CalendarDays className="folder_item-icon--xs" />
          </span>
        )}
        {folder.pinned && <Pin className="folder_item-icon folder_item-icon--xs" />}
        <ActionsButton onOpen={setFolderCtx} />
      </div>

      {folderCtx && <ContextMenu x={folderCtx.x} y={folderCtx.y} items={folderMenuItems} onClose={() => setFolderCtx(null)} />}

      {open && (
        <div>
          {addingFolder && (
            <div style={{ paddingLeft: `${20 + indent}px` }} className="folder_item-new_folder">
              <InlineInput
                defaultValue=""
                onConfirm={(name) => { createFolder.mutate({ name, parent_id: folder.id }); setAddingFolder(false) }}
                onCancel={() => setAddingFolder(false)}
              />
            </div>
          )}

          {folder.children?.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}

          {folder.documents?.map((doc) => {
            const active = location.pathname === `/documents/${doc.id}`
            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className={`folder_item-row folder_item-row--doc${active ? ' folder_item-row--active' : ''}`}
                style={{ paddingLeft: `${36 + indent}px`, paddingRight: '8px' }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDocCtx({ x: e.clientX, y: e.clientY, doc }) }}
              >
                {doc.doc_type === 'table'
                  ? <Database className="folder_item-icon folder_item-icon--sm" />
                  : doc.doc_type === 'spreadsheet'
                  ? <TableIcon className="folder_item-icon folder_item-icon--sm" />
                  : <FileText className="folder_item-icon folder_item-icon--sm" />
                }
                {renamingDocId === doc.id ? (
                  <InlineInput
                    defaultValue={doc.title}
                    onConfirm={(title) => { updateDocument.mutate({ id: doc.id, title }); setRenamingDocId(null) }}
                    onCancel={() => setRenamingDocId(null)}
                  />
                ) : (
                  <span className="folder_item-doc_title">{doc.title}</span>
                )}
                {doc.pinned && <Pin className="folder_item-icon folder_item-icon--xs" />}
                <ActionsButton onOpen={(pos) => setDocCtx({ ...pos, doc })} />
              </Link>
            )
          })}
        </div>
      )}

      {docCtx && (
        <ContextMenu
          x={docCtx.x}
          y={docCtx.y}
          items={[
            { label: 'Rename', action: () => setRenamingDocId(docCtx.doc.id) },
            { label: docCtx.doc.pinned ? 'Unpin' : 'Pin', action: () => pinDocument.mutate({ id: docCtx.doc.id, pinned: !docCtx.doc.pinned }) },
            { label: 'Delete', action: () => deleteDocument.mutate(docCtx.doc.id, { onError: e => setActionError(errorMessage(e)) }), danger: true },
          ]}
          onClose={() => setDocCtx(null)}
        />
      )}
    </div>
  )
}
