import { flattenFolders } from '@/data/folder'
import { featureOn, quickAddTypes, type WorkspaceFeature } from '@/data/workspaceFeature'
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher'
import { TransferHost } from '@/components/workspace/TransferDialog'
import { Button, Input, Select, DatePicker, Menu } from '@/components/ui'
import './Sidebar.scss'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebarStore } from '@/store/sidebar'
import { useActiveOnboarding, useOnboardingStore } from '@/store/onboarding'
import AppearanceDialog from '@/components/AppearanceDialog'
import {
  CheckSquare, FileText, Database,
  Table as TableIcon, Pin, Folder, Loader2, CalendarDays,
  Plus, Keyboard, Download, Palette, Sparkles, LogOut, ChevronsUpDown,
} from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import { usePinFolder } from '@/api/folders'
import { usePinDocument } from '@/api/documents'
import { useNewDocument } from '@/hooks/useNewDocument'
import { useCreateTask } from '@/api/tasks'
import { useCreateEvent } from '@/api/events'
import { useEpics } from '@/api/epics'
import { errorMessage } from '@/api/tables'
import { useStartQuipImport, useQuipImport } from '@/api/quipImports'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTabsStore } from '@/store/tabs'
import { closeTab } from '@/lib/closeTab'
import { ProjectNav } from './ProjectNav'
import { SidebarRail } from './SidebarRail'
import { useProjectStore } from '@/store/projects'
import api from '@/lib/api'
import logoMark from '@/assets/logo-mark.svg'
import { todayISO } from '@/util/date'
import { isElectron } from '@/util/platform'
import { isShortcut, shortcutAvailable, shortcutKey, shortcutLabel } from '@/util/shortcuts'

// Kept in sync by hand with the onKey handler below — there's only one
// place global shortcuts are bound, so this is just their display copy. A
// shortcut for a page the Space turned off (feature) is left out of the list
// and does nothing.
// A shortcut can name a shorter label (taskOnlyLabel) for when Events is off.
const KEYBOARD_SHORTCUTS: { keys: string; label: string; feature?: WorkspaceFeature; taskOnlyLabel?: string }[] = [
  { keys: '⌘K', label: 'Quick-add a task or event', taskOnlyLabel: 'Quick-add a task' },
  { keys: '⌘N', label: 'New document in this folder' },
  { keys: '⌘⇧N', label: 'New sheet in this folder' },
  { keys: '⌘T', label: 'New task in this folder' },
  { keys: '⌘E', label: 'New event', feature: 'events' },
  { keys: '⌘J', label: 'New idea', feature: 'ideas' },
  { keys: '⌘W', label: 'Close the active tab' },
  { keys: '⌘/', label: 'Show or hide this list' },
  { keys: 'Esc', label: 'Close a dialog or panel' },
]

// The extra top padding/drag-region reserve room for macOS's traffic
// lights, which only exist in the packaged Electron app's frameless
// window — in a normal browser tab there's nothing to reserve space for,
// so it just reads as unwanted empty padding.

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: workspace } = useWorkspace()
  // What quick add can make: an event only while the Space uses Events.
  const quickAddTypeList = quickAddTypes(workspace)
  const newDocument = useNewDocument()
  const pinDocument = usePinDocument()
  const pinFolder = usePinFolder()
  const { user, logout } = useAuthStore()
  const drawerOpen = useSidebarStore((s) => s.open)
  const closeDrawer = useSidebarStore((s) => s.close)
  const createTask = useCreateTask()
  const createEvent = useCreateEvent()
  const { data: epics = [] } = useEpics()
  const [creationError, setCreationError] = useState('')
  const onboardingVisible = useActiveOnboarding(user?.id) !== null
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [quipImportOpen, setQuipImportOpen] = useState(false)
  const [quipToken, setQuipToken] = useState('')
  const [quipDomain, setQuipDomain] = useState('quip.com')
  const [startedQuipImportId, setStartedQuipImportId] = useState<number | null>(null)
  const startQuipImport = useStartQuipImport()
  const { data: quipImport } = useQuipImport(startedQuipImportId)
  const qc = useQueryClient()
  const qcRef = useRef(qc)
  qcRef.current = qc
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'task' | 'event'>('task')
  const [quickAddTitle, setQuickAddTitle] = useState('')
  const [quickAddDate, setQuickAddDate] = useState('')
  const [quickAddEpicId, setQuickAddEpicId] = useState('')
  const creatingRef = useRef(false)
  const quickAddInputRef = useRef<HTMLInputElement>(null)
  const createNewDocumentRef = useRef(createNewDocument)
  createNewDocumentRef.current = createNewDocument
  const createNewSpreadsheetRef = useRef(createNewSpreadsheet)
  createNewSpreadsheetRef.current = createNewSpreadsheet
  const scopeFolderIdRef = useRef<number | undefined>(undefined)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace
  const openQuickAddRef = useRef(openQuickAdd)
  openQuickAddRef.current = openQuickAdd
  const shortcutsOpenRef = useRef(shortcutsOpen)
  shortcutsOpenRef.current = shortcutsOpen
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

  // Cmd+N → new document, Cmd+Shift+N → new sheet, Cmd+T → new task, Cmd+E → new event, Cmd+J → new idea, Cmd+W → close
  // tab, Cmd+K → quick-add a task or event without leaving the current page,
  // Cmd+/ (or Cmd+? — Shift+/ on a US layout) → toggle the shortcuts cheat
  // sheet. Keep KEYBOARD_SHORTCUTS below in sync with this list.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Not gated by metaKey — Escape closes whichever of this rail's own
        // overlays is open, matching the "Esc" row in the shortcuts list.
        if (shortcutsOpenRef.current) setShortcutsOpen(false)
        else if (quickAddOpenRef.current) setQuickAddOpen(false)
        else if (quipImportOpenRef.current) setQuipImportOpen(false)
        else if (drawerOpenRef.current) closeDrawer()
        return
      }
      if (isShortcut(e, 'n')) {
        e.preventDefault()
        if (e.shiftKey) createNewSpreadsheetRef.current()
        else createNewDocumentRef.current()
      } else if (isShortcut(e, 't')) {
        e.preventDefault()
        const fid = scopeFolderIdRef.current
        navigate(`/tasks?view=backlog&new=1${fid ? `&folder_id=${fid}` : ''}`)
      } else if (isShortcut(e, 'e')) {
        e.preventDefault()
        if (featureOn(workspaceRef.current, 'events')) navigate('/events?new=1')
      } else if (isShortcut(e, 'j')) {
        e.preventDefault()
        if (featureOn(workspaceRef.current, 'ideas')) navigate('/ideas?new=1')
      } else if (isShortcut(e, 'k')) {
        e.preventDefault()
        openQuickAddRef.current()
      } else if (isShortcut(e, '/')) {
        e.preventDefault()
        setShortcutsOpen((open) => !open)
      } else if ((e.metaKey || e.ctrlKey) && shortcutKey(e) === 'w') {
        // Always prevented, even with no tab open: Electron's default macOS
        // menu binds Cmd+W to closing the whole window (see main.cjs), and
        // that's a native accelerator a renderer preventDefault() can't
        // reach — this only matters for the in-page fallback/web build.
        e.preventDefault()
        const { activeId } = useTabsStore.getState()
        if (!activeId) return
        const next = closeTab(activeId, qcRef.current)
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
    // Otherwise new things go in the open project.
    return useProjectStore.getState().activeProjectId ?? undefined
  }
  scopeFolderIdRef.current = scopeFolderId()

  async function createAtRoot(type: 'document' | 'spreadsheet' | 'table') {
    if (creatingRef.current) return
    creatingRef.current = true
    setCreationError('')
    try {
      await newDocument(type, scopeFolderId())
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

  return (
    <>
      {/* Mobile-only backdrop — tap outside the drawer to close it. */}
      {drawerOpen && (
        <div className="sidebar-backdrop" onClick={closeDrawer} />
      )}
      <div
        className={`view-sidebar${drawerOpen ? ' view-sidebar--open' : ''}`}
      >
      {/* The panel: the Space switcher, pinned items and the projects (the
          open one lists its files and pages). */}
      <aside
        className="sidebar-panel"
      >
        <div
          className={`sidebar-header sidebar-drag${isElectron ? ' sidebar-header--electron' : ''}`}
        >
          <WorkspaceSwitcher>
            <img src={logoMark} alt="" className="sidebar-logo" />
          </WorkspaceSwitcher>
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

          <ProjectNav />

          {creationError && <p role="alert" className="sidebar-error">{creationError}</p>}
        </div>

        {/* The signed-in person, with the account menu */}
        <div className="sidebar-footer">
          <Menu
            above
            label={`Account: ${user?.name ?? 'not signed in'}`}
            triggerClassName="sidebar-user"
            items={[
              { key: 'quick-add', label: 'Quick add', hint: '⌘K', icon: <Plus className="sidebar-icon--sm" />, onSelect: openQuickAdd },
              { key: 'shortcuts', label: 'Keyboard shortcuts', hint: '⌘/', icon: <Keyboard className="sidebar-icon--sm" />, onSelect: () => setShortcutsOpen(true) },
              { key: 'appearance', label: 'Appearance', icon: <Palette className="sidebar-icon--sm" />, onSelect: () => setAppearanceOpen(true), separatorBefore: true },
              { key: 'quip', label: 'Import from Quip', icon: <Download className="sidebar-icon--sm" />, onSelect: () => setQuipImportOpen(true) },
              ...(user && !onboardingVisible ? [{ key: 'onboarding', label: 'Show getting started', icon: <Sparkles className="sidebar-icon--sm" />, onSelect: () => { useOnboardingStore.getState().reopen(user.id); navigate('/space') } }] : []),
              { key: 'sign-out', label: 'Sign out', icon: <LogOut className="sidebar-icon--sm" />, onSelect: handleLogout, separatorBefore: true },
            ]}
          >
            <span className="sidebar-avatar" aria-hidden="true">{initials}</span>
            <span className="sidebar-identity">
              <span className="sidebar-user_name">{user?.name ?? 'Not signed in'}</span>
              <span className="sidebar-user_email">{user?.email}</span>
            </span>
            <ChevronsUpDown className="sidebar-icon--sm sidebar-icon--muted sidebar-icon--shrink" aria-hidden="true" />
          </Menu>
        </div>
      </aside>

      {/* The icon rail, to the right of the panel: a button for every page. */}
      <SidebarRail onQuickAdd={openQuickAdd} onShortcuts={() => setShortcutsOpen(true)} />
      </div>

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

      {/* Move or copy to another Space — opened from the tree's menus */}
      <TransferHost />
      <AppearanceDialog open={appearanceOpen} onClose={() => setAppearanceOpen(false)} />

      {/* Keyboard shortcuts modal */}
      {shortcutsOpen && (
        <div className="sidebar-overlay" onClick={() => setShortcutsOpen(false)}>
          <div className="sidebar-dialog sidebar-dialog--narrow" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-dialog_title">
              <Keyboard className="sidebar-icon--md sidebar-icon--muted" />
              <h2 className="sidebar-dialog_heading">Keyboard shortcuts</h2>
            </div>
            <div className="sidebar-shortcuts">
              {KEYBOARD_SHORTCUTS.filter(({ keys, feature }) => shortcutAvailable(keys) && featureOn(workspace, feature)).map(({ keys, label, taskOnlyLabel }) => (
                <div key={keys} className="sidebar-shortcut">
                  <span>{taskOnlyLabel && !quickAddTypeList.includes('event') ? taskOnlyLabel : label}</span>
                  <kbd className="sidebar-kbd">{shortcutLabel(keys)}</kbd>
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
            {/* Only worth a tab bar while there is more than a task to make. */}
            {quickAddTypeList.length > 1 && (
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
            )}

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
              <DatePicker
                value={quickAddDate}
                onChange={(e) => setQuickAddDate(e.target.value)}
                className="sidebar-input sidebar-input--compact"
              />
            </label>

            {quickAddType === 'task' && epics.length > 0 && featureOn(workspace, 'epics') && (
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
