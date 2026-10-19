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

export type FolderKind = 'folder' | 'project'
export type ProjectType = 'blank' | 'software' | 'music_release' | 'video' | 'event' | 'marketing_campaign' | 'writing' | 'personal'
// How a folder's Gantt reacts to dependency links when a task is rescheduled.
export type DependencyMode = 'none' | 'strict' | 'flexible'

export interface Folder {
  id: number
  name: string
  // A project is a folder of docs listed on the Projects screen.
  kind: FolderKind
  project_type?: ProjectType
  dependency_mode?: DependencyMode
  parent_id: number | null
  root?: boolean
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

export type WorkspaceRole = 'viewer' | 'member' | 'admin' | 'owner'

// A workspace the signed-in user belongs to; `role` is their role in it.
export interface WorkspaceSummary {
  id: number
  name: string
  personal: boolean
  role: WorkspaceRole | null
}

export interface Workspace extends WorkspaceSummary {
  root_folder_id?: number
  folders: Folder[]
}

export interface WorkspaceMember {
  id: number
  role: WorkspaceRole
  user_id: number
  user: { id: number; name: string; email: string }
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'backlog'
  start_date?: string | null
  due_date: string | null
  position: number
  document_id: number
  assignee_id: number | null
  milestone_id?: number | null
  epic_id: number | null
  sprint_id?: number | null
  parent_id: number | null
  folder_id: number | null
  document?: Document
}

// Gantt link (PM-13): the successor waits on the predecessor.
export type DependencyKind = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export interface TaskDependency {
  id: number
  predecessor_id: number
  successor_id: number
  kind: DependencyKind
  created_at: string
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
  initiative_id: number | null
  milestone_id: number | null
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  horizon: RoadmapHorizon | null
  created_at: string
  updated_at: string
}

// Now / Next / Later column on the roadmap board. Null means "not placed by
// hand"; data/roadmap.ts derives a column from status and dates instead.
export type RoadmapHorizon = 'now' | 'next' | 'later'

export type PlanningStatus = 'planned' | 'active' | 'done'
export type MilestoneHealth = 'on_track' | 'at_risk' | 'off_track'

export interface Milestone {
  id: number
  title: string
  description: string | null
  target_date: string | null
  status: PlanningStatus
  owner_id: number | null
  folder_id: number | null
  tasks_count: number
  done_tasks_count: number
  epics_count: number
  initiatives_count: number
  percent: number
  health: MilestoneHealth
  created_at: string
  updated_at: string
}

export interface Initiative {
  id: number
  title: string
  description: string | null
  status: PlanningStatus
  owner_id: number | null
  milestone_id: number | null
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  horizon: RoadmapHorizon | null
  health: MilestoneHealth
  created_at: string
  updated_at: string
}

// OKRs (PM-31). A key result with initiative_id takes its percent from that
// initiative's tasks; otherwise it measures current_value from start_value
// toward target_value. The server computes every percent.
export interface KeyResult {
  id: number
  objective_id: number
  title: string
  initiative_id: number | null
  start_value: number
  target_value: number | null
  current_value: number
  unit: string | null
  position: number
  percent: number
  created_at: string
  updated_at: string
}

export interface Objective {
  id: number
  title: string
  description: string | null
  status: PlanningStatus
  owner_id: number | null
  start_date: string | null
  target_date: string | null
  percent: number
  score: number
  health: MilestoneHealth
  key_results: KeyResult[]
  created_at: string
  updated_at: string
}

// Orthogonal to Milestone/Initiative/Epic: a time-boxed slice of work, not
// a rollup level — start_date/end_date (not target_date), since a sprint
// genuinely ends on that date rather than aiming for it.
export interface Sprint {
  id: number
  title: string
  goal: string | null
  status: PlanningStatus
  owner_id: number | null
  start_date: string | null
  end_date: string | null
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
