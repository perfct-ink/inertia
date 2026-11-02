// Files embedded in a document: what kind of thing each one is and how it is
// shown (an inline image, a video or audio player, or a file card). Pure, so
// the rules are tested without the editor; the Tiptap nodes and the card
// component only apply them.

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file'
export type FileIconKind = 'audio' | 'video' | 'image' | 'archive' | 'spreadsheet' | 'document' | 'file'

// What POST /api/v1/uploads returns.
export interface UploadedFile {
  url: string
  filename: string
  content_type: string
  byte_size: number
}

// The attributes of the `audio` and `fileAttachment` document nodes.
export interface AttachmentAttrs {
  src: string | null
  name: string | null
  size: number | null
  type: string | null
}

// The server's per-file cap (UploadsController::MAX_SIZE).
export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024

const GENERIC_TYPE = 'application/octet-stream'

// Only types a browser draws or plays inline become images and videos; any
// other image or video (TIFF, MKV...) is a file card with a download. SVG is
// one of them on purpose: Active Storage serves it as a download, never as a
// page or picture, because an SVG can carry script.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']

// Browsers send a blank or generic type for many files (FLAC and OGG often
// do), so the file extension decides then.
const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', ogv: 'video/ogg',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', aac: 'audio/aac',
  pdf: 'application/pdf',
}

const FILE_GROUPS: Record<string, FileIconKind> = {
  zip: 'archive', gz: 'archive', tgz: 'archive', tar: 'archive', rar: 'archive', '7z': 'archive',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet', ods: 'spreadsheet', numbers: 'spreadsheet',
  pdf: 'document', doc: 'document', docx: 'document', ppt: 'document', pptx: 'document', key: 'document',
  pages: 'document', odt: 'document', rtf: 'document', txt: 'document', md: 'document',
}

const EXTENSION_LABELS: Record<string, string> = {
  pdf: 'PDF', zip: 'ZIP archive', gz: 'GZ archive', tgz: 'TGZ archive', tar: 'TAR archive', rar: 'RAR archive', '7z': '7z archive',
  doc: 'Word document', docx: 'Word document', xls: 'Excel spreadsheet', xlsx: 'Excel spreadsheet',
  ppt: 'PowerPoint', pptx: 'PowerPoint', key: 'Keynote', pages: 'Pages document', numbers: 'Numbers spreadsheet',
  csv: 'CSV', txt: 'Text', md: 'Markdown', json: 'JSON', rtf: 'Rich text',
}

// "Song.MP3" -> "mp3"; "" when the name has no extension.
export function fileExtension(name: string | null | undefined): string {
  const base = (name ?? '').split(/[\\/]/).pop() ?? ''
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

// The MIME type to trust: the declared one, else one worked out from the extension.
export function resolveType(type: string | null | undefined, name: string | null | undefined): string {
  const declared = (type ?? '').split(';')[0].trim().toLowerCase()
  if (declared && declared !== GENERIC_TYPE) return declared
  return EXTENSION_TYPES[fileExtension(name)] ?? GENERIC_TYPE
}

// Which document node a file becomes: image and video keep their own nodes,
// audio gets a player, everything else a file card.
export function attachmentKind(type: string | null | undefined, name: string | null | undefined): AttachmentKind {
  const resolved = resolveType(type, name)
  if (IMAGE_TYPES.includes(resolved)) return 'image'
  if (VIDEO_TYPES.includes(resolved)) return 'video'
  if (resolved.startsWith('audio/')) return 'audio'
  return 'file'
}

// What the card's Preview button can show in a dialog; null when it can't.
export function previewKind(type: string | null | undefined, name: string | null | undefined): 'image' | 'pdf' | null {
  const resolved = resolveType(type, name)
  if (IMAGE_TYPES.includes(resolved)) return 'image'
  return resolved === 'application/pdf' ? 'pdf' : null
}

// The picture on a file card.
export function fileIconKind(type: string | null | undefined, name: string | null | undefined): FileIconKind {
  const resolved = resolveType(type, name)
  if (resolved.startsWith('audio/')) return 'audio'
  if (resolved.startsWith('video/')) return 'video'
  if (resolved.startsWith('image/')) return 'image'
  if (resolved === 'application/zip') return 'archive'
  return FILE_GROUPS[fileExtension(name)] ?? 'file'
}

// A short, readable type: "PDF", "ZIP archive", "MP3 audio", or the upper-cased extension.
export function fileTypeLabel(type: string | null | undefined, name: string | null | undefined): string {
  const extension = fileExtension(name)
  if (EXTENSION_LABELS[extension]) return EXTENSION_LABELS[extension]
  const resolved = resolveType(type, name)
  if (resolved === 'application/pdf') return 'PDF'
  if (resolved === 'application/zip') return 'ZIP archive'
  const category = ['audio', 'video', 'image'].find((c) => resolved.startsWith(`${c}/`))
  if (category) return extension ? `${extension.toUpperCase()} ${category}` : category[0].toUpperCase() + category.slice(1)
  return extension ? extension.toUpperCase() : 'File'
}

// 1536 -> "1.5 KB", 5242880 -> "5 MB".
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1).replace(/\.0$/, '')} ${units[unit]}`
}

// The message to show before uploading when the server would refuse the file; null when it is fine.
export function uploadProblem(file: { name: string; size: number }): string | null {
  return file.size > MAX_ATTACHMENT_BYTES
    ? `${file.name} is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)} and can't be attached.`
    : null
}

// Document content is shared and editable, so a link or media source in it is
// used only if it is http(s) or a path on this site, never javascript: or data:.
export function safeAttachmentUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed
  return /^\/(?![/\\])\S*$/.test(trimmed) ? trimmed : null
}

// Active Storage sends the file as a download, not a page view, with this parameter.
export function downloadUrl(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}disposition=attachment`
}

// The editor node (Tiptap JSON) that embeds an uploaded file.
export function attachmentContent(file: UploadedFile): { type: string; attrs: Record<string, unknown> } {
  const attrs = { src: file.url, name: file.filename, size: file.byte_size, type: file.content_type }
  switch (attachmentKind(file.content_type, file.filename)) {
    case 'image': return { type: 'image', attrs: { src: file.url, alt: file.filename } }
    case 'video': return { type: 'video', attrs: { src: file.url } }
    case 'audio': return { type: 'audio', attrs }
    default: return { type: 'fileAttachment', attrs }
  }
}

// Reads the node attributes back from pasted or stored HTML (see extensions/Attachment.ts).
export function attachmentAttrsFromElement(element: { getAttribute(name: string): string | null }): AttachmentAttrs {
  const size = Number(element.getAttribute('data-size'))
  return {
    src: element.getAttribute('src') ?? element.getAttribute('data-src'),
    name: element.getAttribute('data-name'),
    size: Number.isFinite(size) && size > 0 ? size : null,
    type: element.getAttribute('data-file-type'),
  }
}

// The files to upload for a paste, or none. A copy from Word, Excel or a web
// page carries a picture of the selection beside its HTML; that paste stays
// text. Screenshots and files copied in the file manager carry files only.
export function pastedFiles<F>(clipboard: { files?: ArrayLike<F> | null; types?: ArrayLike<string> | null } | null | undefined): F[] {
  const files = Array.from(clipboard?.files ?? [])
  if (files.length === 0) return []
  return Array.from(clipboard?.types ?? []).includes('text/html') ? [] : files
}
