import type { Folder } from '@/types'

// A folder tree as one flat list (each folder before its descendants).
export function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])])
}
