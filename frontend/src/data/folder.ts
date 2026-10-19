import type { Document, Folder } from '@/types'
import { lastModified } from './document'

// A folder tree as one flat list (each folder before its descendants).
export function flattenFolders(folders: Folder[]): Folder[] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children ?? [])])
}

// Every document in a folder and the folders nested under it.
export function documentsIn(folder: Folder): Document[] {
  return [...(folder.documents ?? []), ...(folder.children ?? []).flatMap(documentsIn)]
}

// The Space's active projects, wherever they sit in the tree, by name.
export function projectsOf(folders: Folder[]): Folder[] {
  return flattenFolders(folders)
    .filter((f) => f.kind === 'project' && !f.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// The Space's active feature folders (folders holding feature requirement docs), by name.
export function featureFoldersOf(folders: Folder[]): Folder[] {
  return flattenFolders(folders)
    .filter((f) => f.kind === 'feature' && !f.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// One document in a Space: where it lives and which project holds it.
export interface SpaceFile {
  document: Document
  folder: Folder
  // Folder names from the top of the Space down to the document's folder,
  // without Root; empty for a document directly in Root.
  path: string[]
  project: Folder | null
}

// Every document in a Space, each with its folder path and nearest project.
export function spaceFiles(folders: Folder[]): SpaceFile[] {
  const walk = (folder: Folder, path: string[], project: Folder | null): SpaceFile[] => {
    const here = folder.root ? path : [...path, folder.name]
    const nearest = folder.kind === 'project' ? folder : project
    return [
      ...(folder.documents ?? []).map((document) => ({ document, folder, path: here, project: nearest })),
      ...(folder.children ?? []).flatMap((child) => walk(child, here, nearest)),
    ]
  }
  return folders.flatMap((f) => walk(f, [], null))
}

// Files whose title or location contains the query, ignoring case.
export function searchSpaceFiles(files: SpaceFile[], query: string): SpaceFile[] {
  const q = query.trim().toLowerCase()
  if (!q) return files
  return files.filter((f) => [f.document.title, ...f.path].some((s) => s.toLowerCase().includes(q)))
}

// When anything in a project last changed, or null for an empty one.
export function projectLastModified(project: Folder): string | null {
  return documentsIn(project).map(lastModified).sort().pop() ?? null
}
