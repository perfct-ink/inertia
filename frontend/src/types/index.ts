export interface Document {
  id: number
  title: string
  doc_type: 'document' | 'spreadsheet' | 'table' | 'file'
  folder_id: number
  // Who made the file; the "owner" shown and filtered on the All files page.
  created_by_id?: number
  // For doc_type 'file': the uploaded file.
  file?: { url: string; filename: string; content_type: string; byte_size: number } | null
  initiative_id?: number | null
  parent_feature_id?: number | null
  feature_status?: FeatureStatus | null
  feature_owner_id?: number | null
  epic_id?: number | null
  milestone_id?: number | null
  pinned: boolean
  created_at: string
  updated_at: string
  content_updated_at: string | null
  content?: Record<string, unknown> | null
}

export type FolderKind = 'folder' | 'project' | 'feature'
export type FeatureStatus = 'planned' | 'active' | 'done'
export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'done'
// How a folder's Gantt reacts to dependency links when a task is rescheduled.
export type DependencyMode = 'none' | 'strict' | 'flexible'

export interface Folder {
  id: number
  name: string
  // A project is a folder of docs listed on the Projects screen.
  kind: FolderKind
  // A project's emoji, and an uploaded image shown instead when set.
  icon?: string | null
  image_url?: string | null
  dependency_mode?: DependencyMode
  // Project details (kind: project)
  owner_id?: number | null
  project_status?: ProjectStatus
  start_date?: string | null
  target_date?: string | null
  description?: string | null
  parent_id: number | null
  // A document in this folder shown when the folder is opened.
  home_document_id?: number | null
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

// A folder as listed for choosing where to put something in a Space: the
// flat list from GET /api/v1/workspaces/:id/folders, without contents.
export type SpaceFolder = Pick<Folder, 'id' | 'name' | 'parent_id' | 'position' | 'root'>

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
  // More than one person can open it (members or teams), so its projects are shared.
  shared?: boolean
  folders: Folder[]
}

export interface WorkspaceMember {
  id: number
  role: WorkspaceRole
  user_id: number
  // Hours this person can work in a week (resource planning compares allocations with it).
  weekly_capacity_hours: number
  user: { id: number; name: string; email: string }
}

// A person's planned time on a project (a folder with kind "project"). No
// start means already under way; no end means ongoing.
export interface ResourceAllocation {
  id: number
  user_id: number
  folder_id: number
  hours_per_week: number
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

// The fixed set every task is in. A board can call each one something else
// and colour it (see TaskStatusSetting), but a task is always one of these.
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'backlog'
export type TaskStatusColor = 'gray' | 'blue' | 'yellow' | 'green' | 'orange' | 'red' | 'purple'

// One board's label and/or colour for one status. folder_id null is the Space
// default; a folder's rows apply to its board and the folders nested in it.
export interface TaskStatusSetting {
  id: number
  folder_id: number | null
  status: TaskStatus
  label: string | null
  color: TaskStatusColor | null
}

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export type TaskKind = 'task' | 'bug' | 'story'

export interface WorkspaceInvitation {
  id: number
  email: string
  role: WorkspaceRole
  token: string
  created_at: string
}

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  kind?: TaskKind
  start_date?: string | null
  due_date: string | null
  position: number
  document_id: number
  assignee_id: number | null
  logged_minutes?: number
  timer_entry_id?: number | null
  timer_started_at?: string | null
  assignee_ids?: number[]
  watcher_ids?: number[]
  milestone_id?: number | null
  epic_id: number | null
  sprint_id?: number | null
  parent_id: number | null
  folder_id: number | null
  priority?: TaskPriority
  estimate_hours?: number | null
  story_points?: number | null
  actual_story_points?: number | null
  recurrence?: string | null
  recurrence_from?: 'schedule' | 'completion'
  // An ongoing task never completes; it asks its assignees for a check-in on a
  // schedule (the same rule format as `recurrence`).
  ongoing?: boolean
  check_in_recurrence?: string | null
  // The status of the latest check-in; null until the first.
  check_in_status?: CheckInStatus | null
  // The day the next check-in is due, and whether that day has passed unanswered.
  check_in_due_on?: string | null
  check_in_stale?: boolean
  document?: Document
  // Values of the Space's custom task fields, keyed by field id; fields with
  // no value are absent. Only the task list endpoint includes them.
  field_values?: TaskFieldValues
}

// Custom task fields (Monday-style columns), defined once per Space.
export type TaskFieldType = 'tags' | 'dropdown' | 'checkbox' | 'rating' | 'vote'

export interface TaskField {
  id: number
  name: string
  field_type: TaskFieldType
  // The choices of a dropdown field; empty for every other kind.
  options: string[]
}

// tags: labels. dropdown: the chosen label. checkbox: true. rating: 1 to 5.
// vote: the ids of the users who voted.
export type TaskFieldValue = string | string[] | number | number[] | boolean
export type TaskFieldValues = Record<string, TaskFieldValue>

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
  // Order among the epics of one initiative (or milestone); see data/hierarchy.ts.
  position: number
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
  // Order among the initiatives of one milestone; see data/hierarchy.ts.
  position: number
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

export interface KeyResultCheckIn {
  id: number
  key_result_id: number
  value: number
  note: string | null
  author_name: string | null
  created_at: string
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

// Project intake: a member asks for a project; an admin or owner approves it
// (which creates the project folder, project_id) or declines it with a reason.
export type ProjectRequestStatus = 'pending' | 'approved' | 'declined'
export type ProjectRequestPriority = 'low' | 'medium' | 'high'

export interface ProjectRequest {
  id: number
  name: string
  description: string | null
  justification: string | null
  priority: ProjectRequestPriority
  status: ProjectRequestStatus
  start_date: string | null
  target_date: string | null
  decision_note: string | null
  decided_at: string | null
  project_id: number | null
  requested_by_id: number | null
  requested_by_name: string | null
  decided_by_id: number | null
  decided_by_name: string | null
  created_at: string
  updated_at: string
}
// An idea or feature request; promoting it creates an epic or initiative.
export type IdeaStatus = 'open' | 'promoted' | 'declined'
export interface Idea {
  id: number
  title: string
  description: string | null
  status: IdeaStatus
  promoted_type: 'Epic' | 'Initiative' | null
  promoted_id: number | null
  submitted_by_id: number | null
  submitted_by_name: string | null
  created_at: string
  updated_at: string
}
// Intermediate Objectives Map: one goal, critical success factors under it,
// necessary conditions under those. progress is 0-100 or null when unmeasured.
export type IoNodeKind = 'goal' | 'csf' | 'nc'
export interface IoNode {
  id: number
  parent_id: number | null
  kind: IoNodeKind
  title: string
  description: string | null
  position: number
  objective_id: number | null
  initiative_id: number | null
  progress: number | null
}

// How an ongoing task is going, as its owner answers a check-in.
export type CheckInStatus = 'on_track' | 'at_risk' | 'blocked'

// One check-in on an ongoing task: a status and an optional note.
export interface TaskCheckIn {
  id: number
  status: CheckInStatus
  note: string | null
  author_name: string | null
  created_at: string
}

// One status transition of a task; from_status is null for the creation row.
export interface TaskStatusChange {
  id: number
  from_status: Task['status'] | null
  to_status: Task['status']
  changed_by_name: string | null
  created_at: string
}

// One feature in a folder's rollup: nested by `depth`, with task counts that
// include its sub-features. status_derived is true when it wasn't set by hand.
export interface FeatureRow {
  id: number
  title: string
  folder_id: number
  parent_feature_id: number | null
  owner_id: number | null
  owner_name: string | null
  epic_id: number | null
  milestone_id: number | null
  depth: number
  tasks_count: number
  done_tasks_count: number
  percent: number
  status: FeatureStatus
  status_derived: boolean
}

// A named snapshot of a folder's planned task dates (Gantt planned vs. actual).
export interface Baseline {
  id: number
  name: string
  folder_id: number
  created_at: string
  tasks: { task_id: number; start_date: string | null; due_date: string }[]
}

// One project in the portfolio table.
export interface PortfolioRow {
  id: number
  name: string
  owner_id: number | null
  owner_name: string | null
  project_status: ProjectStatus
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  percent: number
  health: MilestoneHealth
}

// An item in the signed-in person's inbox.
export interface AppNotification {
  id: number
  kind: string
  title: string
  body: string | null
  subject_type: string | null
  subject_id: number | null
  workspace_id: number
  read_at: string | null
  created_at: string
}
