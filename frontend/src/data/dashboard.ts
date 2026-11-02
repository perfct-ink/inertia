import { parseISO } from 'date-fns'
import type { Epic, Folder, Initiative, Milestone, MilestoneHealth, RoadmapHorizon, Task } from '@/types'
import { documentsIn, flattenFolders, folderChoices, spaceFiles, type FolderChoice } from '@/data/folder'
import { healthCounts, nextMilestone } from '@/data/milestone'
import { horizonCounts } from '@/data/roadmap'
import { taskFolderId, taskSummary, upcomingTasks, type TaskSummary } from '@/data/task'

// The dashboard rolls up the tasks, files, milestones and boards of a whole
// Space, or of one folder and everything nested under it (the "scope"). It
// holds no data of its own: every number comes from the models' own rollups
// (data/task.ts, data/milestone.ts, data/roadmap.ts).

export interface DashboardInput {
  folders: Folder[]
  tasks: Task[]
  milestones: Milestone[]
  initiatives: Initiative[]
  epics: Epic[]
}

// One folder under the scope, with everything nested in it counted.
export interface FolderRow {
  folder: Folder
  files: number
  tasks: TaskSummary
}

export interface Dashboard {
  // The folder everything is limited to, or null for the whole Space.
  scope: Folder | null
  files: number
  tasks: TaskSummary
  // Open tasks with a due date, soonest first.
  upcoming: Task[]
  folders: FolderRow[]
  milestones: { total: number; health: Record<MilestoneHealth, number>; next: Milestone | null }
  // Initiatives and epics have no folder, so the Now / Next / Later board is
  // Space-wide: null once the dashboard is limited to a folder.
  roadmap: Record<RoadmapHorizon, number> | null
}

// A folder (never the Root) by id, or null.
export function findFolder(folders: Folder[], id: number | null): Folder | null {
  if (id == null) return null
  return flattenFolders(folders).find((f) => f.id === id && !f.root) ?? null
}

// The ids of a folder and every folder nested under it.
export function subtreeIds(folder: Folder): Set<number> {
  return new Set(flattenFolders([folder]).map((f) => f.id))
}

// The folders the dashboard can be limited to, as "Messages / Design" paths.
// The Root is the whole Space, so it is left out (and so are archived folders).
export function scopeChoices(folders: Folder[]): FolderChoice[] {
  const active = flattenFolders(folders).filter((f) => !f.archived)
  const rootIds = new Set(active.filter((f) => f.root).map((f) => f.id))
  return folderChoices(active).filter((choice) => !rootIds.has(choice.id))
}

// The folders listed under the scope: its subfolders, or for the whole Space
// the folders at the top level (the Root's children).
function childFolders(folders: Folder[], scope: Folder | null): Folder[] {
  const children = scope ? scope.children ?? [] : folders.flatMap((f) => (f.root ? f.children ?? [] : [f]))
  return children.filter((f) => !f.archived)
}

export function buildDashboard(input: DashboardInput, scopeId: number | null, today: string): Dashboard {
  const scope = findFolder(input.folders, scopeId)
  const ids = scope ? subtreeIds(scope) : null
  const inScope = (folderId: number | null | undefined) => ids === null || (folderId != null && ids.has(folderId))

  const tasks = input.tasks.filter((t) => inScope(taskFolderId(t)))
  const milestones = input.milestones.filter((m) => inScope(m.folder_id))

  const folders = childFolders(input.folders, scope).map((folder) => {
    const folderIds = subtreeIds(folder)
    const folderTasks = input.tasks.filter((t) => {
      const id = taskFolderId(t)
      return id != null && folderIds.has(id)
    })
    return { folder, files: documentsIn(folder).length, tasks: taskSummary(folderTasks, today) }
  })

  return {
    scope,
    files: scope ? documentsIn(scope).length : spaceFiles(input.folders).length,
    tasks: taskSummary(tasks, today),
    upcoming: upcomingTasks(tasks),
    folders,
    milestones: { total: milestones.length, health: healthCounts(milestones), next: nextMilestone(milestones) },
    roadmap: scope ? null : horizonCounts(input.initiatives, input.epics, parseISO(today)),
  }
}

// Where the dashboard's task board link goes: the Workboard, narrowed to the
// scope's folder when there is one.
export function taskBoardPath(scopeId: number | null): string {
  return scopeId == null ? '/tasks?view=kanban' : `/tasks?view=kanban&folder_id=${scopeId}`
}

// The dashboard limited to a folder, or the whole Space for null.
export function dashboardPath(scopeId: number | null): string {
  return scopeId == null ? '/dashboard' : `/dashboard?folder=${scopeId}`
}
