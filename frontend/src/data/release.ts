import type { Document, Folder, Release, ReleaseKind } from '@/types'
import { flattenFolders } from '@/data/folder'

export const RELEASE_KINDS: { value: ReleaseKind; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'ep', label: 'EP' },
  { value: 'album', label: 'Album' },
  { value: 'music_video', label: 'Music video' },
]

export function releaseKindLabel(kind: ReleaseKind): string {
  return RELEASE_KINDS.find((k) => k.value === kind)?.label ?? kind
}

// Releases by date (undated last), then title.
export function sortReleases(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => {
    if (a.release_date && b.release_date && a.release_date !== b.release_date) return a.release_date.localeCompare(b.release_date)
    if (!a.release_date !== !b.release_date) return a.release_date ? -1 : 1
    return a.title.localeCompare(b.title)
  })
}

// Every ordinary document in the Space (not sheets or collections), by title.
export function songCandidates(folders: Folder[]): Document[] {
  return flattenFolders(folders)
    .flatMap((f) => f.documents ?? [])
    .filter((d) => d.doc_type === 'document')
    .sort((a, b) => a.title.localeCompare(b.title))
}
