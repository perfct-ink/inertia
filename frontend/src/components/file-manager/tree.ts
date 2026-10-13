import type { Folder } from '@/types'

export function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap(folder => [folder, ...flattenFolders(folder.children ?? [])])
}
