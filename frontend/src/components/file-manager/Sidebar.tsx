import { flattenFolders } from '@/data/folder'
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher'
import { Button, Input, Select } from '@/components/ui'
import './Sidebar.scss'
import { Database } from 'lucide-react'
import { useState, useRef, useEffect, type ComponentType } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebarStore } from '@/store/sidebar'
import {
  FolderPlus, CheckSquare, FilePlus, FileText,
  Table as TableIcon, Pin, Folder, Loader2, CalendarDays,
  Plus, Target, Flag, FolderKanban, Milestone, Rocket, ListTree, Map as MapIcon, Goal, GanttChart, Archive, ArchiveRestore, Keyboard, Download,
} from 'lucide-react'
import {
  useWorkspace, useCreateFolder, useCreateDocument, usePinDocument, usePinFolder,
  useArchivedFolders, useUpdateFolder,
} from '@/api/workspace'
import { useCreateTask } from '@/api/tasks'
import { useCreateEvent } from '@/api/events'
import { useEpics } from '@/api/epics'
import { errorMessage } from '@/api/tables'
import { useStartQuipImport, useQuipImport } from '@/api/quipImports'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTabsStore } from '@/store/tabs'
import { FolderItem } from './FolderItem'
import api from '@/lib/api'
import logoMark from '@/assets/logo-mark.svg'
import { todayISO } from '@/util/date'

// Kept in sync by hand with the onKey handler below — there's only one
// place global shortcuts are bound, so this is just their display copy.
const KEYBOARD_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘K', label: 'Quick-add a task or event' },
  { keys: '⌘N', label: 'New document in this folder' },
  { keys: '⌘⇧N', label: 'New sheet in this folder' },
  { keys: '⌘T', label: 'New task in this folder' },
  { keys: '⌘E', label: 'New event' },
  { keys: '⌘W', label: 'Close the active tab' },
  { keys: '⌘/', label: 'Show or hide this list' },
  { keys: 'Esc', label: 'Close a dialog or panel' },
]

// The extra top padding/drag-region reserve room for macOS's traffic
// lights, which only exist in the packaged Electron app's frameless
// window — in a normal browser tab there's nothing to reserve space for,
// so it just reads as unwanted empty padding.
const isElectron = navigator.userAgent.toLowerCase().includes('electron')

// Backlog/Workboard and List/Month toggles already live on each page's own
// header (TasksPage, EventsPage) — the rail only needs to get you to a
// section, not duplicate its sub-views too.
function RailButton({ icon: Icon, label, active, onClick }: {
  icon: ComponentType<{ className?: string }>
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`sidebar-rail_button${active ? ' sidebar-rail_button--active' : ''}`}
    >
      <Icon className="sidebar-icon--md" />
    </Button>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: workspace, isLoading } = useWorkspace()
  const createFolder = useCreateFolder()
  const createDocument = useCreateDocument()
  const pinDocument = usePinDocument()
  const pinFolder = usePinFolder()
  const updateFolder = useUpdateFolder()
  const { user, logout } = useAuthStore()
  const drawerOpen = useSidebarStore((s) => s.open)
  const closeDrawer = useSidebarStore((s) => s.close)
  const createTask = useCreateTask()
  const createEvent = useCreateEvent()
  const { data: epics = [] } = useEpics()
  const [creationError, setCreationError] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const { data: archivedFolders = [] } = useArchivedFolders()
  const [accountOpen, setAccountOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [quipImportOpen, setQuipImportOpen] = useState(false)
  const [quipToken, setQuipToken] = useState('')
  const [quipDomain, setQuipDomain] = useState('quip.com')
  const [startedQuipImportId, setStartedQuipImportId] = useState<number | null>(null)
  const startQuipImport = useStartQuipImport()
  const { data: quipImport } = useQuipImport(startedQuipImportId)
  const qc = useQueryClient()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'event'>('task')
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddDate, setQuickAddDate] = useState('')
  const [quickAddEpicId, setQuickAddEpicId] = useState('')
  const creatingRef = useRef(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const quickAddInputRef = useRef<HTMLInputElement>(null)
  const createNewDocumentRef = useRef(createNewDocument)
  createNewDocumentRef.current = createNewDocument
  const createNewSpreadsheetRef = useRef(createNewSpreadsheet)
  createNewSpreadsheetRef.current = createNewSpreadsheet
  const scopeFolderIdRef = useRef<number | undefined>(undefined)
  const openQuickAddRef = useRef(openQuickAdd)
  openQuickAddRef.current = openQuickAdd
  const shortcutsOpenRef = useRef(shortcutsOpen)
  shortcutsOpenRef.current = shortcutsOpen
  const accountOpenRef = useRef(accountOpen)
  accountOpenRef.current = accountOpen
  const quickAddOpenRef = useRef(quickAddOpen)
  quickAddOpenRef.current = quickAddOpen
  const quipImportOpenRef = useRef(quipImportOpen)
  quipImportOpenRef.current = quipImportOpen
  const drawerOpenRef = useRef(drawerOpen)
  drawerOpenRef.current = drawerOpen

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  // Closes the mobile drawer after navigating anywhere — otherwise it stays
  // open over the page you just picked, which reads as broken on a phone.
  useEffect(() => { closeDrawer() }, [location.pathname])

  useEffect(() => { if (addingFolder) folderInputRef.current?.focus() }, [addingFolder])
  useEffect(() => { if (quickAddOpen) quickAddInputRef.current?.focus() }, [quickAddOpen])
  // Refreshes the folder tree once imported content actually exists to
  // show — polling every 1.5s in between would just re-render the same
  // (empty-so-far) tree for no benefit.
  useEffect(() => {
    if (quipImport?.status === 'completed') qc.invalidateQueries({ queryKey: [ 'workspace' ] })
  }, [ quipImport?.status ])

  function openQuickAdd() {
    setQuickAddType('task')
    setQuickAddTitle('')
    setQuickAddDate('')
    setQuickAddEpicId('')
    setQuickAddOpen(true)
  }

  function submitQuickAdd() {
    const title = quickAddTitle.trim()
    if (!title) return
    if (quickAddType === 'task') {
      createTask.mutate({ title, dueDate: quickAddDate || undefined, epicId: quickAddEpicId ? Number(quickAddEpicId) : undefined })
    } else {
      createEvent.mutate({ title, date: quickAddDate || todayISO(), event_type: 'deadline' })
    }
    setQuickAddOpen(false)
  }

  // Cmd+N → new document, Cmd+Shift+N → new sheet, Cmd+T → new task, Cmd+E → new event, Cmd+W → close
  // tab, Cmd+K → quick-add a task or event without leaving the current page,
  // Cmd+/ (or Cmd+? — Shift+/ on a US layout) → toggle the shortcuts cheat
  // sheet. Keep KEYBOARD_SHORTCUTS below in sync with this list.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Not gated by metaKey — Escape closes whichever of this rail's own
        // overlays is open, matching the "Esc" row in the shortcuts list.
        if (shortcutsOpenRef.current) setShortcutsOpen(false)
        else if (accountOpenRef.current) setAccountOpen(false)
        else if (quickAddOpenRef.current) setQuickAddOpen(false)
        else if (quipImportOpenRef.current) setQuipImportOpen(false)
        else if (drawerOpenRef.current) closeDrawer()
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        if (e.shiftKey) createNewSpreadsheetRef.current()
        else createNewDocumentRef.current()
      } else if (e.key === 't') {
        e.preventDefault()
        const fid = scopeFolderIdRef.current
        navigate(`/tasks?view=backlog&new=1${fid ? `&folder_id=${fid}` : ''}`)
      } else if (e.key === 'e') {
        e.preventDefault()
        navigate('/events?new=1')
      } else if (e.key === 'k') {
        e.preventDefault()
        openQuickAddRef.current()
      } else if (e.key === '/' || e.key === '?') {
        e.preventDefault()
        setShortcutsOpen((open) => !open)
      } else if (e.key === 'w') {
        // Always prevented, even with no tab open: Electron's default macOS
        // menu binds Cmd+W to closing the whole window (see main.cjs), and
        // that's a native accelerator a renderer preventDefault() can't
        // reach — this only matters for the in-page fallback/web build.
        e.preventDefault()
        const { activeId, closeTab } = useTabsStore.getState()
        if (!activeId) return
        const next = closeTab(activeId)
        navigate(next ? next.path : '/space')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleLogout() {
    api.delete('/api/v1/auth/logout').finally(() => {
      logout()
      navigate('/login')
    })
  }

  // The folder the user is "in": the open folder page, or the folder of the
  // open document. Falls back to the workspace root on any other page.
  function scopeFolderId() {
    const folderMatch = location.pathname.match(/^\/folders\/(\d+)/)
    if (folderMatch) return Number(folderMatch[1])
    const docMatch = location.pathname.match(/^\/documents\/(\d+)/)
    if (docMatch) {
      const folder = flattenFolders(workspace?.folders ?? []).find((f) => f.documents?.some((d) => d.id === Number(docMatch[1])))
      if (folder) return folder.id
    }
    return undefined
  }
  scopeFolderIdRef.current = scopeFolderId()

  async function createAtRoot(type: 'document' | 'spreadsheet' | 'table') {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreationError('')
    try {
      const current = workspace ?? (await api.get('/api/v1/workspace')).data
      const folderId = scopeFolderId() ?? current.root_folder_id ?? current.folders?.[0]?.id
      if (!folderId) throw new Error('The space root is unavailable. Please try again.')
      const title = type === 'document' ? 'Untitled' : type === 'table' ? 'Untitled Collection' : 'Untitled Sheet'
      const doc = await createDocument.mutateAsync({ folderId, title, doc_type: type })
      navigate(`/documents/${doc.id}`)
    } catch (error) {
      setCreationError(errorMessage(error))
    } finally {
      creatingRef.current = false
    }
  }

  function createNewDocument() { return createAtRoot('document') }
  function createNewSpreadsheet(type: 'spreadsheet' | 'table' = 'spreadsheet') { return createAtRoot(type) }

  const allFolders = flattenFolders(workspace?.folders ?? [])
  const allDocs = allFolders.flatMap((f) => f.documents ?? [])
  const pinnedDocs = allDocs.filter((d) => d.pinned)
  const pinnedFolders = allFolders.filter((f) => f.pinned)
  const hasPinned = pinnedDocs.length > 0 || pinnedFolders.length > 0

  const isDocumentsSection = location.pathname === '/' || location.pathname.startsWith('/documents')

  return (
    <>
      {/* Mobile-only backdrop — tap outside the drawer to close it. */}
      {drawerOpen && (
        <div className="sidebar-backdrop" onClick={closeDrawer} />
      )}
      <div
        className={`view-sidebar${drawerOpen ? ' view-sidebar--open' : ''}`}
      >
      {/* Icon rail — top-level section nav. Traffic lights float over its
          top-left corner, so the top strip and the flexible middle spacer
          are both drag regions (nothing interactive sits in either). */}
      <nav
        className="sidebar-rail"
      >
        {isElectron && (
          <div className="sidebar-titlebar sidebar-drag" />
        )}
        <div className="sidebar-rail_group">
          <RailButton icon={FileText} label="All files" active={isDocumentsSection} onClick={() => navigate('/documents')} />
          <RailButton icon={FolderKanban} label="Projects" active={location.pathname === '/projects'} onClick={() => navigate('/projects')} />
          <RailButton icon={CheckSquare} label="Tasks" active={location.pathname === '/tasks'} onClick={() => navigate('/tasks?view=backlog')} />
          <RailButton icon={CalendarDays} label="Events" active={location.pathname === '/events'} onClick={() => navigate('/events?view=list')} />
          <RailButton icon={Target} label="Epics" active={location.pathname === '/epics'} onClick={() => navigate('/epics')} />
          <RailButton icon={Flag} label="Initiatives" active={location.pathname === '/initiatives'} onClick={() => navigate('/initiatives')} />
          <RailButton icon={GanttChart} label="Timeline" active={location.pathname === '/timeline'} onClick={() => navigate('/timeline')} />
          <RailButton icon={Milestone} label="Milestones" active={location.pathname === '/milestones'} onClick={() => navigate('/milestones')} />
          <RailButton icon={Rocket} label="Sprints" active={location.pathname === '/sprints'} onClick={() => navigate('/sprints')} />
          <RailButton icon={Goal} label="OKRs" active={location.pathname === '/okrs'} onClick={() => navigate('/okrs')} />
          <RailButton icon={MapIcon} label="Roadmap" active={location.pathname === '/roadmap'} onClick={() => navigate('/roadmap')} />
          <RailButton icon={ListTree} label="Hierarchy" active={location.pathname === '/hierarchy'} onClick={() => navigate('/hierarchy')} />
        </div>
        <div className="sidebar-rail_spacer sidebar-drag" />
        <div className="sidebar-rail_group">
          <RailButton icon={Plus} label="Quick add (⌘K)" onClick={openQuickAdd} />
          <RailButton icon={Keyboard} label="Keyboard shortcuts (⌘/)" onClick={() => setShortcutsOpen(true)} />
          <Button variant="primary"
            onClick={() => setAccountOpen(true)}
            title={user?.name ?? 'Account'}
            aria-label={user?.name ?? 'Account'}
            className="sidebar-avatar_button"
          >
            {initials}
          </Button>
        </div>
      </nav>

      {/* Detail panel — Pinned + the Documents tree, the content that's
          actually unique to it now that Tasks/Events/Epics moved to the
          rail. */}
      <aside
        className="sidebar-panel"
      >
        <div
          className={`sidebar-header sidebar-drag${isElectron ? ' sidebar-header--electron' : ''}`}
        >
          <img src={logoMark} alt="" className="sidebar-logo" />
          <div className="sidebar-brand">
            <p className="sidebar-brand_name">Inertia</p>
            <WorkspaceSwitcher />
          </div>
        </div>

        <div className="sidebar-body">
          {/* Pinned section */}
          {hasPinned && (
            <div>
              <div className="sidebar-section_bar sidebar-section_bar--pinned">
                <Pin className="sidebar-icon--xs sidebar-icon--muted" />
                <span className="sidebar-section_label">Pinned</span>
              </div>
              {pinnedFolders.map((folder) => {
                const firstDoc = folder.documents?.[0]
                return (
                  <Button
                    key={folder.id}
                    onClick={() => firstDoc && navigate(`/documents/${firstDoc.id}`)}
                    className="sidebar-pinned_item"
                  >
                    <Folder className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" />
                    <span className="sidebar-item_label">{folder.name}</span>
                    <Button
                      onClick={(e) => { e.stopPropagation(); pinFolder.mutate({ id: folder.id, pinned: false }) }}
                      className="sidebar-unpin"
                      title="Unpin"
                      aria-label="Unpin"
                    >
                      <Pin className="sidebar-icon--xs" />
                    </Button>
                  </Button>
                )
              })}
              {pinnedDocs.map((doc) => {
                const active = location.pathname === `/documents/${doc.id}`
                return (
                  <Button
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className={`sidebar-pinned_item${active ? ' sidebar-pinned_item--active' : ''}`}
                  >
                    {doc.doc_type === 'table'
                      ? <Database className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" />
                      : doc.doc_type === 'spreadsheet'
                      ? <TableIcon className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" />
                      : <FileText className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" />
                    }
                    <span className="sidebar-item_label">{doc.title}</span>
                    <Button
                      onClick={(e) => { e.stopPropagation(); pinDocument.mutate({ id: doc.id, pinned: false }) }}
                      className="sidebar-unpin"
                      title="Unpin"
                      aria-label="Unpin"
                    >
                      <Pin className="sidebar-icon--xs" />
                    </Button>
                  </Button>
                )
              })}
            </div>
          )}

          {creationError && <p role="alert" className="sidebar-error">{creationError}</p>}
          {/* Documents section (unified tree) */}
          <div>
            <div className="sidebar-section_bar sidebar-section_bar--documents">
              <Button
                onClick={() => navigate('/documents')}
                className="sidebar-section_label sidebar-section_link"
              >
                Documents
              </Button>
              <div className="sidebar-tools">
                <Button
                  title={showArchived ? 'Show active folders' : 'Show archived folders'}
                  onClick={() => setShowArchived((s) => !s)}
                  aria-label={showArchived ? 'Show active folders' : 'Show archived folders'}
                  className={`sidebar-tool${showArchived ? ' sidebar-tool--active' : ''}`}
                >
                  <Archive className="sidebar-icon--sm" />
                </Button>
                <Button
                  title="New document (⌘N)"
                  aria-label="New document (⌘N)"
                  onClick={() => createNewDocument()}
                  className="sidebar-tool"
                >
                  <FilePlus className="sidebar-icon--sm" />
                </Button>
                <Button
                  title="New Sheet"
                  aria-label="New Sheet"
                  onClick={() => createNewSpreadsheet()}
                  className="sidebar-tool"
                >
                  <TableIcon className="sidebar-icon--sm" />
                </Button>
                <Button
                  title="New Collection"
                  aria-label="New Collection"
                  onClick={() => createNewSpreadsheet('table')}
                  className="sidebar-tool"
                >
                  <Database className="sidebar-icon--sm" />
                </Button>
                <Button
                  title="New folder"
                  aria-label="New folder"
                  onClick={() => setAddingFolder(true)}
                  className="sidebar-tool"
                >
                  <FolderPlus className="sidebar-icon--sm" />
                </Button>
              </div>
            </div>

            {showArchived ? (
              <div className="sidebar-archived">
                {archivedFolders.length === 0 && (
                  <p className="sidebar-note">No archived folders</p>
                )}
                {archivedFolders.map((folder) => (
                  <div key={folder.id} className="sidebar-archived_row">
                    <Folder className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" />
                    <Button
                      onClick={() => navigate(`/folders/${folder.id}`)}
                      className="sidebar-archived_open"
                    >
                      {folder.name}
                    </Button>
                    <Button
                      onClick={() => updateFolder.mutate({ id: folder.id, archived: false })}
                      title="Unarchive"
                      aria-label="Unarchive"
                      className="sidebar-unarchive"
                    >
                      <ArchiveRestore className="sidebar-icon--sm" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {addingFolder && (
                  <div className="sidebar-new_folder">
                    <Input
                      ref={folderInputRef}
                      placeholder="Folder name"
                      className="sidebar-folder_input"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          createFolder.mutate({ name: e.currentTarget.value.trim() })
                          setAddingFolder(false)
                        }
                        if (e.key === 'Escape') setAddingFolder(false)
                      }}
                      onBlur={() => setAddingFolder(false)}
                    />
                  </div>
                )}

                {isLoading && (
                  <div className="sidebar-loading">
                    <Loader2 className="sidebar-icon--md sidebar-icon--muted sidebar-icon--spin" />
                  </div>
                )}

                {!isLoading && workspace?.folders?.length === 0 && !addingFolder && (
                  <div className="sidebar-empty">
                    <FilePlus className="sidebar-icon--lg sidebar-icon--faint" />
                  </div>
                )}

                {workspace?.folders?.map((folder) => (
                  <FolderItem key={folder.id} folder={folder} />
                ))}
              </>
            )}
          </div>
        </div>
      </aside>
      </div>

      {/* Account panel — a sibling of the drawer div above, not nested in
          it: that div gets a CSS transform on mobile (the slide-in/out
          animation), and position:fixed descendants of a transformed
          ancestor are positioned relative to IT, not the viewport — these
          modals would otherwise slide off with a closed drawer. */}
      {accountOpen && (
        <div className="sidebar-overlay" onClick={() => setAccountOpen(false)}>
          <div className="sidebar-dialog sidebar-dialog--narrow sidebar-dialog--roomy" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-profile">
              <div className="sidebar-avatar">
                {initials}
              </div>
              <div className="sidebar-identity">
                <p className="sidebar-user_name">{user?.name}</p>
                <p className="sidebar-user_email">{user?.email}</p>
              </div>
            </div>
            <div className="sidebar-account_actions">
              <Button variant="secondary"
                onClick={() => { setAccountOpen(false); setQuipImportOpen(true) }}
                className="sidebar-wide_button sidebar-import_button"
              >
                <Download className="sidebar-icon--sm" />
                Import from Quip
              </Button>
              <Button variant="secondary"
                onClick={handleLogout}
                className="sidebar-wide_button sidebar-signout"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Quip */}
      {quipImportOpen && (
        <div className="sidebar-overlay" onClick={() => setQuipImportOpen(false)}>
          <div className="sidebar-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-dialog_title">
              <Download className="sidebar-icon--md sidebar-icon--muted" />
              <h2 className="sidebar-dialog_heading">Import from Quip</h2>
            </div>

            {!startedQuipImportId ? (
              <>
                <p className="sidebar-hint">
                  Walks your Quip account&apos;s Desktop, Starred, and Shared folders and imports every document found,
                  mirroring the folder structure, into your workspace root.
                </p>
                <label className="sidebar-field">
                  Quip API token
                  <Input
                    type="password"
                    autoFocus
                    value={quipToken}
                    onChange={(e) => setQuipToken(e.target.value)}
                    placeholder="Paste your token"
                    className="sidebar-input"
                  />
                </label>
                <label className="sidebar-field">
                  Domain
                  <Select
                    value={quipDomain}
                    onChange={(e) => setQuipDomain(e.target.value)}
                    className="sidebar-input"
                  >
                    <option value="quip.com">quip.com</option>
                    <option value="quip-apple.com">quip-apple.com</option>
                  </Select>
                </label>
                <div className="sidebar-actions">
                  <Button
                    onClick={() => setQuipImportOpen(false)}
                    className="sidebar-cancel"
                  >
                    Cancel
                  </Button>
                  <Button variant="primary"
                    onClick={() => {
                      startQuipImport.mutate(
                        { token: quipToken, domain: quipDomain },
                        { onSuccess: (imp) => setStartedQuipImportId(imp.id) }
                      )
                    }}
                    disabled={!quipToken.trim() || startQuipImport.isPending}
                    className="sidebar-submit"
                  >
                    {startQuipImport.isPending ? 'Starting…' : 'Start import'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="sidebar-import_status">
                  {(quipImport?.status === 'pending' || quipImport?.status === 'running') && (
                    <Loader2 className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--spin" />
                  )}
                  <span className="sidebar-import_state">
                    {quipImport?.status === 'completed' && 'Done'}
                    {quipImport?.status === 'failed' && 'Failed'}
                    {(quipImport?.status === 'pending' || quipImport?.status === 'running' || !quipImport) && 'Importing…'}
                  </span>
                </div>
                <div className="sidebar-import_counts">
                  <span>{quipImport?.folders_created ?? 0} folders created</span>
                  <span>{quipImport?.documents_imported ?? 0} documents imported</span>
                  {!!quipImport?.documents_failed && <span>{quipImport.documents_failed} documents failed</span>}
                </div>
                {quipImport?.status === 'failed' && quipImport.error_message && (
                  <p className="sidebar-import_error">{quipImport.error_message}</p>
                )}
                <div className="sidebar-actions">
                  <Button
                    onClick={() => {
                      setQuipImportOpen(false)
                      setStartedQuipImportId(null)
                      setQuipToken('')
                    }}
                    className="sidebar-cancel"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div className="sidebar-overlay" onClick={() => setShortcutsOpen(false)}>
          <div className="sidebar-dialog sidebar-dialog--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-dialog_title">
              <Keyboard className="sidebar-icon--md sidebar-icon--muted" />
              <h2 className="sidebar-dialog_heading">Keyboard shortcuts</h2>
            </div>
            <div className="sidebar-shortcuts">
              {KEYBOARD_SHORTCUTS.map(({ keys, label }) => (
                <div key={keys} className="sidebar-shortcut">
                  <span>{label}</span>
                  <kbd className="sidebar-kbd">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick add modal */}
      {quickAddOpen && (
        <div className="sidebar-overlay" onClick={() => setQuickAddOpen(false)}>
          <div className="sidebar-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-tabs">
              <Button
                onClick={() => setQuickAddType('task')}
                className={`sidebar-tab${quickAddType === 'task' ? ' sidebar-tab--active' : ''}`}
              >
                <CheckSquare className="sidebar-icon--sm" />
                Task
              </Button>
              <Button
                onClick={() => setQuickAddType('event')}
                className={`sidebar-tab${quickAddType === 'event' ? ' sidebar-tab--active' : ''}`}
              >
                <CalendarDays className="sidebar-icon--sm" />
                Event
              </Button>
            </div>

            <Input
              ref={quickAddInputRef}
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Title"
              className="sidebar-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitQuickAdd()
                if (e.key === 'Escape') setQuickAddOpen(false)
              }}
            />

            <label className="sidebar-inline_field">
              {quickAddType === 'task' ? 'Due date' : 'Date'}
              <Input
                type="date"
                value={quickAddDate}
                onChange={(e) => setQuickAddDate(e.target.value)}
                className="sidebar-input sidebar-input--compact"
              />
            </label>

            {quickAddType === 'task' && epics.length > 0 && (
              <label className="sidebar-inline_field">
                Epic
                <Select
                  value={quickAddEpicId}
                  onChange={(e) => setQuickAddEpicId(e.target.value)}
                  className="sidebar-input sidebar-input--compact"
                >
                  <option value="">No epic</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>{epic.title}</option>
                  ))}
                </Select>
              </label>
            )}

            <div className="sidebar-actions">
              <Button
                onClick={() => setQuickAddOpen(false)}
                className="sidebar-cancel"
              >
                Cancel
              </Button>
              <Button variant="primary"
                onClick={submitQuickAdd}
                disabled={!quickAddTitle.trim() || createTask.isPending || createEvent.isPending}
                className="sidebar-submit"
              >
                Add {quickAddType === 'task' ? 'task' : 'event'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
