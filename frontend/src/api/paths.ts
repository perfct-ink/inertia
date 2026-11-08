import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ItemType } from '@/data/path'

// What GET /api/v1/paths returns for an address in the active Space.
export interface PathLookup {
  type: ItemType
  id: number
  // The item's current path; differs from the address after a rename or move.
  path: string
  moved: boolean
}

// Resolves a hierarchical address on the server: the live tree first, then the
// addresses an item used to have. The caller shows the error itself (a page
// that is not found is a normal outcome), so the client's error notice is off.
export class PathApi {
  readonly path = '/api/v1/paths'
  readonly queryKey = 'path'

  lookup(pathname: string) {
    return api.get<PathLookup>(this.path, { params: { path: pathname }, silent: true }).then((r) => r.data)
  }
}

export const pathApi = new PathApi()

export function usePathLookup(pathname: string, enabled: boolean) {
  return useQuery<PathLookup>({
    queryKey: [pathApi.queryKey, pathname],
    queryFn: () => pathApi.lookup(pathname),
    enabled,
    retry: false,
  })
}
