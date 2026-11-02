import { useMemo } from 'react'
import { useWorkspace } from '@/api/workspace'
import { useTaskStatusSettings } from '@/api/taskStatusSettings'
import { boardScope, resolveStatuses, type BoardStatuses } from '@/data/task_status'
import type { Folder, TaskStatusSetting } from '@/types'

const NO_SETTINGS: TaskStatusSetting[] = []
const NO_FOLDERS: Folder[] = []

function useStatusSources() {
  const { data: workspace } = useWorkspace()
  const { data: settings = NO_SETTINGS, isSuccess } = useTaskStatusSettings()
  return { folders: workspace?.folders ?? NO_FOLDERS, settings, ready: isSuccess }
}

// How a board shows each task status: the labels and colors set on its folder,
// the folders above it and the Space, else the built-in ones. No folder is the
// Space default (the Tasks page across all folders). `scope`, `settings` and
// `ready` (the settings have loaded) are what the status editor needs.
export function useBoardStatuses(folderId?: number | null) {
  const { folders, settings, ready } = useStatusSources()
  const scope = useMemo(() => boardScope(folders, folderId), [folders, folderId])
  const statuses = useMemo(() => resolveStatuses(settings, scope), [settings, scope])
  return { statuses, scope, settings, ready }
}

// For lists that mix tasks from several folders (an event's tasks, the task
// lines in a document): each task's statuses come from its own folder.
export function useStatusesForFolder(): (folderId?: number | null) => BoardStatuses {
  const { folders, settings } = useStatusSources()
  return useMemo(() => (folderId) => resolveStatuses(settings, boardScope(folders, folderId)), [folders, settings])
}
