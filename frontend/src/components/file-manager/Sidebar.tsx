import { Database } from 'lucide-react'
import { useState, useRef, useEffect, type CSSProperties, type ComponentType } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebarStore } from '@/store/sidebar'
import {
  FolderPlus, CheckSquare, FilePlus, FileText,
  Table as TableIcon, Pin, Folder, Loader2, CalendarDays,
  Plus, Target, Archive, ArchiveRestore, Keyboard, Download,
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

// Kept in sync by hand with the onKey handler below — there's only one
// place global shortcuts are bound, so this is just their display copy.
const KEYBOARD_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘K', label: 'Quick-add a task or event' },
  { keys: '⌘N', label: 'New document' },
  { keys: '⌘T', label: 'New task' },
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

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
    <button
      onClick={onClick}
      title={label}
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
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

  // Cmd+N → new document, Cmd+T → new task, Cmd+E → new event, Cmd+W → close
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
      if (e.key === 'n') {
        e.preventDefault()
        createNewDocumentRef.current()
      } else if (e.key === 't') {
        e.preventDefault()
        navigate('/tasks?view=backlog&new=1')
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
        navigate(next ? next.path : '/workspace')
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

  async function createNewDocument() {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreationError('')
    try {
      let folderId = workspace?.folders?.[0]?.id
      if (!folderId) {
        const folder = await createFolder.mutateAsync({ name: 'Documents' })
        folderId = folder.id
      }
      const doc = await createDocument.mutateAsync({ folderId, title: 'Untitled', doc_type: 'document' })
      navigate(`/documents/${doc.id}`)
    } catch (error) {
      setCreationError(errorMessage(error))
    } finally {
      creatingRef.current = false
    }
  }

  async function createNewSpreadsheet(type: 'spreadsheet' | 'table' = 'spreadsheet') {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreationError('')
    try {
      let folderId = workspace?.folders?.[0]?.id
      if (!folderId) {
        const folder = await createFolder.mutateAsync({ name: 'Documents' })
        folderId = folder.id
      }
      const doc = await createDocument.mutateAsync({ folderId, title: type === 'table' ? 'Untitled Table' : 'Untitled Sheet', doc_type: type })
      navigate(`/documents/${doc.id}`)
    } catch (error) {
      setCreationError(errorMessage(error))
    } finally {
      creatingRef.current = false
    }
  }

  const allDocs = workspace?.folders?.flatMap((f) => f.documents ?? []) ?? []
  const pinnedDocs = allDocs.filter((d) => d.pinned)
  const pinnedFolders = (workspace?.folders ?? []).filter((f) => f.pinned)
  const hasPinned = pinnedDocs.length > 0 || pinnedFolders.length > 0

  const isDocumentsSection = location.pathname === '/' || location.pathname.startsWith('/documents')

  return (
    <>
      {/* Mobile-only backdrop — tap outside the drawer to close it. */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={closeDrawer} />
      )}
      <div
        className={`flex h-screen shrink-0 fixed md:static inset-y-0 left-0 z-40 transition-transform duration-200 ease-out md:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Icon rail — top-level section nav. Traffic lights float over its
          top-left corner, so the top strip and the flexible middle spacer
          are both drag regions (nothing interactive sits in either). */}
      <nav
        className="w-14 border-r bg-muted/30 flex flex-col items-center h-screen shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isElectron && (
          <div className="h-8 w-full shrink-0" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />
        )}
        <div className="flex flex-col items-center gap-1 py-2">
          <RailButton icon={FileText} label="Documents" active={isDocumentsSection} onClick={() => navigate('/documents')} />
          <RailButton icon={CheckSquare} label="Tasks" active={location.pathname === '/tasks'} onClick={() => navigate('/tasks?view=backlog')} />
          <RailButton icon={CalendarDays} label="Events" active={location.pathname === '/events'} onClick={() => navigate('/events?view=list')} />
          <RailButton icon={Target} label="Epics" active={location.pathname === '/epics'} onClick={() => navigate('/epics')} />
        </div>
        <div className="flex-1 w-full" style={{ WebkitAppRegion: 'drag' } as CSSProperties} />
        <div className="flex flex-col items-center gap-1 py-2">
          <RailButton icon={Plus} label="Quick add (⌘K)" onClick={openQuickAdd} />
          <RailButton icon={Keyboard} label="Keyboard shortcuts (⌘/)" onClick={() => setShortcutsOpen(true)} />
          <button
            onClick={() => setAccountOpen(true)}
            title={user?.name ?? 'Account'}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0 mb-2"
          >
            {initials}
          </button>
        </div>
      </nav>

      {/* Detail panel — Pinned + the Documents tree, the content that's
          actually unique to it now that Tasks/Events/Epics moved to the
          rail. */}
      <aside
        className="w-60 border-r bg-muted/20 flex flex-col h-screen"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className={`px-3 pb-3 flex items-center gap-2 ${isElectron ? 'pt-8' : 'pt-3'}`}
          style={{ WebkitAppRegion: 'drag' } as CSSProperties}
        >
          <img src={logoMark} alt="" className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm">Inertia</p>
            <p className="text-xs text-muted-foreground truncate">{workspace?.name ?? 'My Workspace'}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-3">
          {/* Pinned section */}
          {hasPinned && (
            <div>
              <div className="flex items-center gap-1.5 px-3 mb-1">
                <Pin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pinned</span>
              </div>
              {pinnedFolders.map((folder) => {
                const firstDoc = folder.documents?.[0]
                return (
                  <button
                    key={folder.id}
                    onClick={() => firstDoc && navigate(`/documents/${firstDoc.id}`)}
                    className="flex items-center gap-1.5 w-full px-3 py-1 rounded-md text-sm hover:bg-accent text-left group"
                  >
                    <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); pinFolder.mutate({ id: folder.id, pinned: false }) }}
                      className="hidden group-hover:flex text-muted-foreground hover:text-foreground"
                      title="Unpin"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  </button>
                )
              })}
              {pinnedDocs.map((doc) => {
                const active = location.pathname === `/documents/${doc.id}`
                return (
                  <button
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className={`flex items-center gap-1.5 w-full px-3 py-1 rounded-md text-sm hover:bg-accent text-left group ${active ? 'bg-accent' : ''}`}
                  >
                    {doc.doc_type === 'table'
                      ? <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      : doc.doc_type === 'spreadsheet'
                      ? <TableIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      : <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    }
                    <span className="flex-1 truncate">{doc.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); pinDocument.mutate({ id: doc.id, pinned: false }) }}
                      className="hidden group-hover:flex text-muted-foreground hover:text-foreground"
                      title="Unpin"
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                  </button>
                )
              })}
            </div>
          )}

          {creationError && <p role="alert" className="px-3 py-2 text-xs text-red-500">{creationError}</p>}
          {/* Documents section (unified tree) */}
          <div>
            <div className="flex items-center justify-between px-3 mb-1">
              <button
                onClick={() => navigate('/documents')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                Documents
              </button>
              <div className="flex items-center gap-0.5">
                <button
                  title={showArchived ? 'Show active folders' : 'Show archived folders'}
                  onClick={() => setShowArchived((s) => !s)}
                  className={`p-0.5 rounded hover:bg-accent ${showArchived ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                <button
                  title="New document (⌘N)"
                  onClick={() => createNewDocument()}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  title="New Sheet"
                  onClick={() => createNewSpreadsheet()}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  title="New Table"
                  onClick={() => createNewSpreadsheet('table')}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
                <button
                  title="New folder"
                  onClick={() => setAddingFolder(true)}
                  className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {showArchived ? (
              <div className="flex flex-col gap-0.5">
                {archivedFolders.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No archived folders</p>
                )}
                {archivedFolders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm group">
                    <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <button
                      onClick={() => navigate(`/folders/${folder.id}`)}
                      className="flex-1 min-w-0 text-left truncate hover:underline"
                    >
                      {folder.name}
                    </button>
                    <button
                      onClick={() => updateFolder.mutate({ id: folder.id, archived: false })}
                      title="Unarchive"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {addingFolder && (
                  <div className="px-2 pb-1">
                    <input
                      ref={folderInputRef}
                      placeholder="Folder name"
                      className="w-full text-sm px-2 py-0.5 rounded border border-input bg-card outline-none focus:ring-1 focus:ring-primary"
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
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!isLoading && workspace?.folders?.length === 0 && !addingFolder && (
                  <div className="flex flex-col items-center py-4 gap-2 text-muted-foreground">
                    <FilePlus className="w-8 h-8 opacity-30" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAccountOpen(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-80 p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user?.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="border-t pt-4 flex flex-col gap-2">
              <button
                onClick={() => { setAccountOpen(false); setQuipImportOpen(true) }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm border hover:bg-accent"
              >
                <Download className="w-3.5 h-3.5" />
                Import from Quip
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-md text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 border border-red-200 dark:border-red-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Quip */}
      {quipImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQuipImportOpen(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-96 p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Import from Quip</h2>
            </div>

            {!startedQuipImportId ? (
              <>
                <p className="text-xs text-muted-foreground -mt-2">
                  Walks your Quip account's Desktop, Starred, and Shared folders and imports every document found,
                  mirroring the folder structure, into your workspace root.
                </p>
                <label className="flex flex-col gap-1 text-sm">
                  Quip API token
                  <input
                    type="password"
                    autoFocus
                    value={quipToken}
                    onChange={(e) => setQuipToken(e.target.value)}
                    placeholder="Paste your token"
                    className="text-sm px-3 py-2 rounded-lg border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Domain
                  <select
                    value={quipDomain}
                    onChange={(e) => setQuipDomain(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="quip.com">quip.com</option>
                    <option value="quip-apple.com">quip-apple.com</option>
                  </select>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setQuipImportOpen(false)}
                    className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      startQuipImport.mutate(
                        { token: quipToken, domain: quipDomain },
                        { onSuccess: (imp) => setStartedQuipImportId(imp.id) }
                      )
                    }}
                    disabled={!quipToken.trim() || startQuipImport.isPending}
                    className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {startQuipImport.isPending ? 'Starting…' : 'Start import'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  {(quipImport?.status === 'pending' || quipImport?.status === 'running') && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {quipImport?.status === 'completed' && 'Done'}
                    {quipImport?.status === 'failed' && 'Failed'}
                    {(quipImport?.status === 'pending' || quipImport?.status === 'running' || !quipImport) && 'Importing…'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span>{quipImport?.folders_created ?? 0} folders created</span>
                  <span>{quipImport?.documents_imported ?? 0} documents imported</span>
                  {!!quipImport?.documents_failed && <span>{quipImport.documents_failed} documents failed</span>}
                </div>
                {quipImport?.status === 'failed' && quipImport.error_message && (
                  <p className="text-xs text-red-500 break-words">{quipImport.error_message}</p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setQuipImportOpen(false)
                      setStartedQuipImportId(null)
                      setQuipToken('')
                    }}
                    className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShortcutsOpen(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-80 p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Keyboard shortcuts</h2>
            </div>
            <div className="flex flex-col gap-2">
              {KEYBOARD_SHORTCUTS.map(({ keys, label }) => (
                <div key={keys} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs font-mono shrink-0">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick add modal */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setQuickAddOpen(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-96 p-5 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              <button
                onClick={() => setQuickAddType('task')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm ${quickAddType === 'task' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Task
              </button>
              <button
                onClick={() => setQuickAddType('event')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm ${quickAddType === 'event' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Event
              </button>
            </div>

            <input
              ref={quickAddInputRef}
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Title"
              className="w-full text-sm px-3 py-2 rounded-lg border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitQuickAdd()
                if (e.key === 'Escape') setQuickAddOpen(false)
              }}
            />

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {quickAddType === 'task' ? 'Due date' : 'Date'}
              <input
                type="date"
                value={quickAddDate}
                onChange={(e) => setQuickAddDate(e.target.value)}
                className="flex-1 text-sm px-2 py-1 rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </label>

            {quickAddType === 'task' && epics.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Epic
                <select
                  value={quickAddEpicId}
                  onChange={(e) => setQuickAddEpicId(e.target.value)}
                  className="flex-1 text-sm px-2 py-1 rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">No epic</option>
                  {epics.map((epic) => (
                    <option key={epic.id} value={epic.id}>{epic.title}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setQuickAddOpen(false)}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={submitQuickAdd}
                disabled={!quickAddTitle.trim() || createTask.isPending || createEvent.isPending}
                className="px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Add {quickAddType === 'task' ? 'task' : 'event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
