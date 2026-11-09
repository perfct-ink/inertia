import { useEffect } from 'react'
import { useWorkspace } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { usePathStore } from '@/store/paths'

function TreeSync() {
  const { data: workspace } = useWorkspace()
  const folders = workspace?.folders
  useEffect(() => { usePathStore.getState().setFolders(folders ?? []) }, [folders])
  useEffect(() => () => usePathStore.getState().setFolders([]), [])
  return null
}

// Copies the active Space's folder tree into the path store so every link can
// use the item's hierarchical path. Renders nothing, and only runs while signed
// in (the Space is not fetched on the login page). Switching Spaces empties the
// tree, which sends links back to their id paths until the new one loads.
export default function PathSync() {
  const signedIn = useAuthStore((s) => s.token !== null) || process.env.BYPASS_AUTH === 'true'
  return signedIn ? <TreeSync /> : null
}
