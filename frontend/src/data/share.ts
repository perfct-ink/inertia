import { format, parseISO } from 'date-fns'
import type { Epic, Initiative, Milestone } from '@/types'

// Share links: a token that lets anyone read one document, or a folder and the
// documents in it, without signing in (docs/features/shared_links.md). The
// server decides what a link reaches; this file holds the shapes and the
// small pure helpers the pages use.

export type ShareKind = 'document' | 'folder'

// What a menu or button hands to the share dialog.
export interface ShareTarget {
  kind: ShareKind
  id: number
  name: string
}

// A link as the Space's writers see it (the token is a credential).
export interface ShareLink {
  id: number
  token: string
  permission: 'view' | 'edit'
  expires_at: string | null
  created_at: string
  shareable_type: 'Document' | 'Folder'
  shareable_id: number
}

// What a visitor holding a token gets back. `access` is always 'view'.
export interface SharedPage<Resource> {
  kind: ShareKind | 'roadmap'
  access: 'view'
  expires_at: string | null
  resource: Resource
}

export interface SharedDocument {
  // Only on a document opened from inside a folder link.
  id?: number
  title: string
  doc_type: string
  content: Record<string, unknown> | null
  updated_at: string
}

export interface SharedFolderRef { id: number; name: string; icon: string | null }
export interface SharedFolderRow extends SharedFolderRef { parent_id: number }
export interface SharedDocumentRow { id: number; title: string; folder_id: number; updated_at: string }

export interface SharedFolder {
  folder: SharedFolderRef
  folders: SharedFolderRow[]
  documents: SharedDocumentRow[]
  // The listing was cut at the server's cap.
  truncated: boolean
}

// The trimmed roadmap a Space's roadmap link returns (no owners or descriptions).
export interface SharedRoadmap {
  name: string
  milestones: Milestone[]
  initiatives: Initiative[]
  epics: Epic[]
}

// The public page for a share token (see the /shared/:token route).
export function sharedUrl(origin: string, token: string): string {
  return `${origin}/shared/${token}`
}

// A document inside a shared folder.
export function sharedDocumentPath(token: string, documentId: number): string {
  return `/shared/${token}/documents/${documentId}`
}

// Only rich-text documents have a read-only public view so far; spreadsheets,
// Collections and uploaded files can't be shared by link.
export function canShareDocType(docType: string): boolean {
  return docType === 'document'
}

// How long a new link works, in days; '' is until it is turned off.
export const EXPIRY_CHOICES = [
  { value: '7', label: 'In 7 days' },
  { value: '30', label: 'In 30 days' },
  { value: '90', label: 'In 90 days' },
  { value: '', label: 'Never' },
] as const

export const DEFAULT_EXPIRY = '30'

export function expiryText(expiresAt: string | null, now: Date = new Date()): string {
  if (!expiresAt) return 'Never expires'
  const date = parseISO(expiresAt)
  return date.getTime() <= now.getTime() ? 'Expired' : `Expires ${format(date, 'MMM d, yyyy')}`
}

// Links made before editing through a link was ruled out can still be 'edit';
// they open view only like every other.
export function permissionText(permission: ShareLink['permission']): string {
  return permission === 'edit' ? 'View only (made as an edit link)' : 'View only'
}

export interface OutlineNode {
  folder: SharedFolderRef
  documents: SharedDocumentRow[]
  children: OutlineNode[]
}

// The shared folder's contents as a tree: each folder with its documents and
// subfolders. A subfolder with nothing readable in it (no documents, and no
// subfolder with any) is left out, so the list only shows what can be opened.
export function folderOutline(shared: SharedFolder): OutlineNode {
  const build = (folder: SharedFolderRef): OutlineNode => ({
    folder,
    documents: shared.documents.filter((d) => d.folder_id === folder.id),
    children: shared.folders
      .filter((f) => f.parent_id === folder.id)
      .map(build)
      .filter((node) => node.documents.length > 0 || node.children.length > 0),
  })
  return build(shared.folder)
}

// A shared document's text, if there is any to show (a new document is saved as {}).
export function sharedContent(content: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  return content && content.type === 'doc' ? content : null
}

// Why a link page didn't open, from the HTTP status. An unknown, turned-off or
// expired link all answer 404 and read the same on purpose, so the page never
// says which one it was.
export function unavailableText(status: number | undefined): string {
  if (status === 404) return 'This link isn’t available. It may have been turned off or may have expired.'
  if (status === 429) return 'Too many requests right now. Try again in a minute.'
  return 'This page couldn’t be loaded. Check your connection and try again.'
}
