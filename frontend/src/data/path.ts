import type { Document, Folder } from '@/types'

// Hierarchical URLs: a folder or document lives at the slugs of the folders
// above it, e.g. /acme/product/requirements (the Space's Root adds nothing).
// The slugs come from the server (backend/app/models/concerns/sluggable.rb);
// everything here is pure: building the path of an item, finding the item a
// path names, and deciding when a link should be rewritten. The numeric
// /documents/:id and /folders/:id paths stay valid as the fallback.

export type ItemType = 'document' | 'folder'

export interface ItemRef {
  type: ItemType
  id: number
}

// What an item needs to be linked: its id, and (for an item the Space tree
// does not hold yet, such as one just created) its parent folder and slug.
export interface DocumentLike {
  id: number
  folder_id?: number
  slug?: string | null
}

// Where the Space tree puts each item. Items whose slug (or a parent's) is
// missing are left out and link by id instead.
export interface PathIndex {
  rootId: number | null
  folders: Map<number, string>
  documents: Map<number, string>
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

// The slugs in a path, lowercased and without empty parts: "/Acme//product/" -> ["acme", "product"].
export function splitPath(pathname: string): string[] {
  return pathname.split('/').map((segment) => decode(segment).trim().toLowerCase()).filter(Boolean)
}

// ["acme", "product"] -> "/acme/product".
export function joinPath(segments: string[]): string {
  return `/${segments.join('/')}`
}

// The id-based path, which always works: "/documents/12" or "/folders/3". It is
// also how a page opens an item that was just created: the page shows at once,
// and ItemRoute swaps the address for the hierarchical path when the Space tree
// has caught up.
export function idPath({ type, id }: ItemRef): string {
  return `/${type === 'folder' ? 'folders' : 'documents'}/${id}`
}

// The item an id-based path names, or null for any other path.
export function parseIdPath(pathname: string): ItemRef | null {
  const match = /^\/(documents|folders)\/(\d+)\/?$/.exec(pathname)
  return match ? { type: match[1] === 'folders' ? 'folder' : 'document', id: Number(match[2]) } : null
}

export function buildPathIndex(folders: Folder[]): PathIndex {
  const index: PathIndex = { rootId: null, folders: new Map(), documents: new Map() }
  // `prefix` is the path of the parent folder's contents, or null once a slug is missing.
  const walk = (folder: Folder, prefix: string[] | null) => {
    let own: string[] | null = null
    if (folder.root) {
      index.rootId = folder.id
      own = []
    } else if (prefix && folder.slug) {
      own = [...prefix, folder.slug]
      index.folders.set(folder.id, joinPath(own))
    }
    if (!own) return
    for (const document of folder.documents ?? []) {
      if (document.slug) index.documents.set(document.id, joinPath([...own, document.slug]))
    }
    for (const child of folder.children ?? []) walk(child, own)
  }
  // A tree without a flagged Root (older data) is read as if its top folders sat under one.
  for (const folder of folders) walk(folder, [])
  return index
}

// One index per Space payload: links are built all over the sidebar, so the
// tree is walked once per payload rather than once per link.
const indexes = new WeakMap<Folder[], PathIndex>()
export function pathIndexFor(folders: Folder[]): PathIndex {
  let index = indexes.get(folders)
  if (!index) {
    index = buildPathIndex(folders)
    indexes.set(folders, index)
  }
  return index
}

export function folderHref(index: PathIndex, id: number): string {
  return index.folders.get(id) ?? idPath({ type: 'folder', id })
}

// A document's path from the tree, else (when it is not in the tree yet) from
// its folder and slug, else its id path.
export function documentHref(index: PathIndex, document: DocumentLike): string {
  const known = index.documents.get(document.id)
  if (known) return known
  const { folder_id: folderId, slug } = document
  if (folderId !== undefined && slug) {
    if (folderId === index.rootId) return joinPath([slug])
    const parent = index.folders.get(folderId)
    if (parent) return `${parent}/${slug}`
  }
  return idPath({ type: 'document', id: document.id })
}

export function itemHref(index: PathIndex, { type, id }: ItemRef): string {
  return type === 'folder' ? folderHref(index, id) : documentHref(index, { id })
}

// The item named by the slugs of a path, looked up in the Space tree.
export function resolvePath(folders: Folder[], segments: string[]): ItemRef | null {
  if (segments.length === 0) return null
  const root = folders.find((folder) => folder.root)
  let level: { folders: Folder[]; documents: Document[] } = root
    ? { folders: root.children ?? [], documents: root.documents ?? [] }
    : { folders, documents: [] }
  for (const [position, segment] of segments.entries()) {
    const folder = level.folders.find((candidate) => candidate.slug === segment)
    if (position === segments.length - 1) {
      if (folder) return { type: 'folder', id: folder.id }
      const document = level.documents.find((candidate) => candidate.slug === segment)
      return document ? { type: 'document', id: document.id } : null
    }
    if (!folder) return null
    level = { folders: folder.children ?? [], documents: folder.documents ?? [] }
  }
  return null
}

// The item a page path names: an id path or a slug path.
export function itemAtPath(folders: Folder[], pathname: string): ItemRef | null {
  return parseIdPath(pathname) ?? resolvePath(folders, splitPath(pathname))
}

// Where to send someone who opened an item by `pathname`, or null when that is
// already its path (or no better path is known yet). Covers an old id path, a
// path in the wrong case or with a trailing slash, and a renamed item.
export function redirectFor(index: PathIndex, item: ItemRef, pathname: string): string | null {
  const best = itemHref(index, item)
  return best !== pathname && best !== idPath(item) ? best : null
}
