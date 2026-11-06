import { Folder, FolderKanban, Layers, type LucideIcon } from 'lucide-react'
import type { FolderKind } from '@/types'

// The icon for a folder of this kind: a project, a feature folder or a plain
// folder. Shared by the sidebar tree and the folder page's listing.
export function folderIconOf(kind: FolderKind): LucideIcon {
  if (kind === 'project') return FolderKanban
  if (kind === 'feature') return Layers
  return Folder
}
