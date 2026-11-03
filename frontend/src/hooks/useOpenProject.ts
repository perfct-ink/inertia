import { useLocation } from 'react-router-dom'
import { useWorkspace } from '@/api/workspace'
import { projectsOf } from '@/data/folder'
import { useProjectStore } from '@/store/projects'
import type { Folder } from '@/types'

// Pages about the Space's projects as a whole: the sidebar lists the projects
// there instead of the open project's pages.
const SPACE_PAGES = ['/space', '/project-requests', '/automations']

// The project the sidebar shows, or null when it shows the projects list.
export function useOpenProject(): Folder | null {
  const { pathname } = useLocation()
  const { data: workspace } = useWorkspace()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  if (!activeProjectId || SPACE_PAGES.includes(pathname)) return null
  return projectsOf(workspace?.folders ?? []).find((p) => p.id === activeProjectId) ?? null
}
