import type { Document, Folder, SpaceFolder } from '@/types'
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

// The project a folder is in (the nearest project at or above it), or null.
export function projectOf(folders: Folder[], folderId: number): Folder | null {
  return [...folderTrail(folders, folderId)].reverse().find((f) => f.kind === 'project') ?? null
}

// The folder holding a document, or undefined when it isn't in the tree.
export function folderOfDocument(folders: Folder[], documentId: number): Folder | undefined {
  return flattenFolders(folders).find((f) => f.documents?.some((d) => d.id === documentId))
}

// The folders from the top of the Space down to `folderId`, without the Root,
// or [] when the folder is not found (or is the Root itself).
export function folderTrail(folders: Folder[], folderId: number): Folder[] {
  const walk = (folder: Folder, path: Folder[]): Folder[] | null => {
    const here = folder.root ? path : [...path, folder]
    if (folder.id === folderId) return here
    for (const child of folder.children ?? []) {
      const found = walk(child, here)
      if (found) return found
    }
    return null
  }
  for (const folder of folders) {
    const found = walk(folder, [])
    if (found) return found
  }
  return []
}

// The Space's active feature folders (folders holding feature requirement docs), by name.
export function featureFoldersOf(folders: Folder[]): Folder[] {
  return flattenFolders(folders)
    .filter((f) => f.kind === 'feature' && !f.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// The document to open instead of the folder page: the folder's home document,
// unless the visit asked for a specific view of the folder (any query string).
export function homeDocumentToOpen(folder: Pick<Folder, 'home_document_id'>, search: string): number | null {
  return folder.home_document_id && search === '' ? folder.home_document_id : null
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

// The All files filters; an unset filter matches everything. projectId 0 means
// "files outside any project".
export interface SpaceFileFilters {
  projectId?: number
  docType?: Document['doc_type']
  ownerId?: number
}

export function filterSpaceFiles(files: SpaceFile[], filters: SpaceFileFilters): SpaceFile[] {
  return files.filter((f) =>
    (filters.projectId === undefined || (f.project?.id ?? 0) === filters.projectId)
    && (filters.docType === undefined || f.document.doc_type === filters.docType)
    && (filters.ownerId === undefined || f.document.created_by_id === filters.ownerId))
}

// When anything in a project last changed, or null for an empty one.
export function projectLastModified(project: Folder): string | null {
  return documentsIn(project).map(lastModified).sort().pop() ?? null
}

// One place a document or folder can be put in a Space.
export interface FolderChoice {
  id: number
  // The folder's path from the top of the Space ("Messages / Design"); the Root is "Top level".
  label: string
}

// A Space's flat folder list as choices, in tree order (siblings by position,
// then name). A folder whose parent is missing from the list, such as one
// under an archived folder, is left out.
export function folderChoices(folders: SpaceFolder[]): FolderChoice[] {
  const children = new Map<number | null, SpaceFolder[]>()
  for (const folder of folders) {
    children.set(folder.parent_id, [...(children.get(folder.parent_id) ?? []), folder])
  }
  const walk = (parentId: number | null, path: string[]): FolderChoice[] =>
    (children.get(parentId) ?? [])
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
      .flatMap((folder) => {
        const here = folder.root ? path : [...path, folder.name]
        return [{ id: folder.id, label: folder.root ? 'Top level' : here.join(' / ') }, ...walk(folder.id, here)]
      })
  return walk(null, [])
}
