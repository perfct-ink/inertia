import { create } from 'zustand'
import type { Folder } from '@/types'

// The Space's folder tree as of the last Space payload, kept here so any
// component can build a hierarchical link (see hooks/usePaths.ts) without
// fetching. PathSync fills it; until then links use the id paths.
interface PathStore {
  folders: Folder[]
  setFolders: (folders: Folder[]) => void
}

export const usePathStore = create<PathStore>((set) => ({
  folders: [],
  setFolders: (folders) => set({ folders }),
}))
