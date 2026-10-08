export interface Document {
  id: number
  title: string
  doc_type: 'document' | 'spreadsheet' | 'table'
  folder_id: number
  pinned: boolean
  created_at: string
  updated_at: string
  content_updated_at: string | null
  content?: Record<string, unknown> | null
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  position: number
  pinned: boolean
  archived: boolean
  archived_at: string | null
  children: Folder[]
  documents: Document[]
  // Whether this folder (directly, or one of its own documents) has any
  // tasks/events — drives the sidebar's indicator icons. See
  // WorkspacesController#show / FolderBlueprint.
  has_tasks: boolean
  has_events: boolean
}

export interface Workspace {
  id: number
  name: string
  folders: Folder[]
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'backlog'
  due_date: string | null
  position: number
  document_id: number
  assignee_id: number | null
  epic_id: number | null
  parent_id: number | null
  folder_id: number | null
  document?: Document
}

export interface QuipImport {
  id: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  domain: string
  destination_folder_id: number | null
  folders_created: number
  documents_imported: number
  documents_failed: number
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface Epic {
  id: number
  title: string
  folder_id: number | null
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  created_at: string
  updated_at: string
}

export interface WorkspaceEvent {
  id: number
  title: string
  description: string | null
  date: string
  start_time: string | null
  end_time: string | null
  event_type: 'deadline' | 'milestone'
  folder_id: number | null
  tasks: Task[]
  created_at: string
  updated_at: string
}

// FoldersController#contents — everything scoped to a folder and all of
// its nested subfolders, in one request.
export interface FolderContents {
  folder: Folder
  documents: Document[]
  tasks: Task[]
  events: WorkspaceEvent[]
  epics: Epic[]
}
