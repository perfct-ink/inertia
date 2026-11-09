import { parseISO } from 'date-fns'
import type { Epic, Folder, Initiative, Milestone, MilestoneHealth, PlanningStatus, RoadmapHorizon, Sprint, Task } from '@/types'
import { documentsIn, flattenFolders, folderChoices, spaceFiles, type FolderChoice } from '@/data/folder'
import { healthCounts, nextMilestone } from '@/data/milestone'
import { horizonCounts } from '@/data/roadmap'
import { donePercent } from '@/data/schedule'
import { activeSprint } from '@/data/sprint'
import { taskFolderId, taskSummary, upcomingTasks, type TaskSummary } from '@/data/task'

// The dashboard rolls up the tasks, files, milestones and boards of a Space or
// of the project open in it, or of one folder and everything nested under it
// (the "scope"). It holds no data of its own: every number comes from the
// models' own rollups (data/task.ts, data/milestone.ts, data/roadmap.ts,
// data/sprint.ts). The lists it is given are whatever the API returned for the
// signed-in person (already limited to the Space and the open project), so it
// never shows anything they could not already open.

export interface DashboardInput {
  folders: Folder[]
  tasks: Task[]
  milestones: Milestone[]
  initiatives: Initiative[]
  epics: Epic[]
  sprints: Sprint[]
}

// One folder under the scope, with everything nested in it counted.
export interface FolderRow {
  folder: Folder
  files: number
  tasks: TaskSummary
}

export interface SprintRollup {
  total: number
  counts: Record<PlanningStatus, number>
  // The sprint under way, with how far along its tasks are.
  active: { sprint: Sprint; percent: number } | null
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
  // Cards on the Now / Next / Later board.
  roadmap: Record<RoadmapHorizon, number>
  sprints: SprintRollup
}

// A folder (never the Root, never an archived one) by id, or null.
export function findFolder(folders: Folder[], id: number | null | undefined): Folder | null {
  if (id == null) return null
  return flattenFolders(folders).find((f) => f.id === id && !f.root && !f.archived) ?? null
}

// The ids of a folder and every folder nested under it.
export function subtreeIds(folder: Folder): Set<number> {
  return new Set(flattenFolders([folder]).map((f) => f.id))
}

// The folder the dashboard covers. With a project open, that is the project,
// or a folder inside it when one was asked for (a folder outside the project
// is ignored). With none open it is the asked-for folder, else the whole Space
// (null). A folder that is gone or archived counts as not asked for.
export function resolveScope(folders: Folder[], scopeId: number | null, projectId: number | null = null): Folder | null {
  const project = findFolder(folders, projectId)
  const requested = findFolder(folders, scopeId)
  if (!project) return requested
  return requested && subtreeIds(project).has(requested.id) ? requested : project
}

// The folders the dashboard can be narrowed to, as "Messages / Design" paths:
// every active folder of the Space, or only those inside the open project. The
// Root is the whole Space, so it is left out (and so are archived folders).
export function scopeChoices(folders: Folder[], projectId: number | null = null): FolderChoice[] {
  const project = findFolder(folders, projectId)
  const inside = project ? subtreeIds(project) : null
  const active = flattenFolders(folders).filter((f) => !f.archived)
  const rootIds = new Set(active.filter((f) => f.root).map((f) => f.id))
  return folderChoices(active).filter((choice) =>
    !rootIds.has(choice.id) && (!inside || (inside.has(choice.id) && choice.id !== project?.id)))
}

// The folders listed under the scope: its subfolders, or for the whole Space
// the folders at the top level (the Root's children).
function childFolders(folders: Folder[], scope: Folder | null): Folder[] {
  const children = scope ? scope.children ?? [] : folders.flatMap((f) => (f.root ? f.children ?? [] : [f]))
  return children.filter((f) => !f.archived)
}

// Initiatives and epics filed in the scope. An epic whose initiative is left
// out stands alone on the board, since the initiative's card would have carried it.
function scopeRoadmap(initiatives: Initiative[], epics: Epic[], inScope: (folderId: number | null | undefined) => boolean) {
  const scopedInitiatives = initiatives.filter((i) => inScope(i.folder_id))
  const kept = new Set(scopedInitiatives.map((i) => i.id))
  const scopedEpics = epics
    .filter((e) => inScope(e.folder_id))
    .map((e) => (e.initiative_id != null && !kept.has(e.initiative_id) ? { ...e, initiative_id: null } : e))
  return { initiatives: scopedInitiatives, epics: scopedEpics }
}

function sprintRollup(sprints: Sprint[]): SprintRollup {
  const counts: Record<PlanningStatus, number> = { planned: 0, active: 0, done: 0 }
  sprints.forEach((s) => { counts[s.status] += 1 })
  const sprint = activeSprint(sprints)
  return { total: sprints.length, counts, active: sprint ? { sprint, percent: donePercent(sprint) } : null }
}

export function buildDashboard(input: DashboardInput, scopeId: number | null, today: string, projectId: number | null = null): Dashboard {
  const scope = resolveScope(input.folders, scopeId, projectId)
  const ids = scope ? subtreeIds(scope) : null
  const inScope = (folderId: number | null | undefined) => ids === null || (folderId != null && ids.has(folderId))

  const tasks = input.tasks.filter((t) => inScope(taskFolderId(t)))
  const milestones = input.milestones.filter((m) => inScope(m.folder_id))
  const roadmap = scopeRoadmap(input.initiatives, input.epics, inScope)

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
    roadmap: horizonCounts(roadmap.initiatives, roadmap.epics, parseISO(today)),
    sprints: sprintRollup(input.sprints.filter((s) => inScope(s.folder_id))),
  }
}

// Where the dashboard's task board link goes: the Workboard, narrowed to the
// scope's folder when there is one.
export function taskBoardPath(scopeId: number | null): string {
  return scopeId == null ? '/tasks?view=kanban' : `/tasks?view=kanban&folder_id=${scopeId}`
}

// The dashboard limited to a folder, or the whole Space (or open project) for null.
export function dashboardPath(scopeId: number | null): string {
  return scopeId == null ? '/dashboard' : `/dashboard?folder=${scopeId}`
}
