import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjectStore } from '@/store/projects'

// Queries that don't change with the project: the Space tree and its lists.
const SPACE_QUERIES = new Set(['workspace', 'workspaces', 'archived-folders'])

// Opens a project (or null for the whole Space). Every other cached list
// belongs to the previous project, so those are reset and refetched.
export function useSelectProject() {
  const qc = useQueryClient()
  return useCallback((id: number | null) => {
    if (useProjectStore.getState().activeProjectId === id) return
    useProjectStore.getState().setActive(id)
    qc.resetQueries({ predicate: (q) => !SPACE_QUERIES.has(String(q.queryKey[0])) })
  }, [qc])
}
