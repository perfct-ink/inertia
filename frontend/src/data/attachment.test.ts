import {
  MAX_ATTACHMENT_BYTES,
  attachmentAttrsFromElement,
  attachmentContent,
  attachmentKind,
  downloadUrl,
  fileExtension,
  fileIconKind,
  fileTypeLabel,
  formatBytes,
  pastedFiles,
  previewKind,
  resolveType,
  safeAttachmentUrl,
  uploadProblem,
} from './attachment'

test('fileExtension is the lower-cased text after the last dot', () => {
  expect(fileExtension('Song.MP3')).toBe('mp3')
  expect(fileExtension('archive.tar.gz')).toBe('gz')
  expect(fileExtension('C:\\music\\track.flac')).toBe('flac')
  expect(fileExtension('README')).toBe('')
  expect(fileExtension('.bashrc')).toBe('')
  expect(fileExtension(null)).toBe('')
})

test('resolveType trusts a declared type and falls back to the extension for blank or generic ones', () => {
  expect(resolveType('audio/mpeg; codecs=mp3', 'x.bin')).toBe('audio/mpeg')
  expect(resolveType('', 'track.flac')).toBe('audio/flac')
  expect(resolveType('application/octet-stream', 'clip.MOV')).toBe('video/quicktime')
  expect(resolveType(undefined, 'notes.xyz')).toBe('application/octet-stream')
})

test('attachmentKind picks the node: image and video stay, audio gets a player, the rest a file card', () => {
  expect(attachmentKind('image/png', 'a.png')).toBe('image')
  expect(attachmentKind('video/mp4', 'a.mp4')).toBe('video')
  for (const [type, name] of [['audio/mpeg', 'a.mp3'], ['audio/mp4', 'a.m4a'], ['audio/wav', 'a.wav'], ['audio/flac', 'a.flac'], ['audio/ogg', 'a.ogg']]) {
    expect(attachmentKind(type, name)).toBe('audio')
  }
  expect(attachmentKind('application/pdf', 'a.pdf')).toBe('file')
  expect(attachmentKind('application/zip', 'a.zip')).toBe('file')
  expect(attachmentKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'a.docx')).toBe('file')
})

test('attachmentKind falls back to the extension when the browser sends no type', () => {
  expect(attachmentKind('', 'track.flac')).toBe('audio')
  expect(attachmentKind('application/octet-stream', 'photo.JPG')).toBe('image')
  expect(attachmentKind('', 'clip.webm')).toBe('video')
  expect(attachmentKind('', 'data.bin')).toBe('file')
})

test('images and videos a browser cannot show become file cards', () => {
  expect(attachmentKind('image/svg+xml', 'logo.svg')).toBe('file')
  expect(previewKind('image/svg+xml', 'logo.svg')).toBeNull()
  expect(fileTypeLabel('image/svg+xml', 'logo.svg')).toBe('SVG image')
  expect(attachmentKind('image/tiff', 'scan.tif')).toBe('file')
  expect(attachmentKind('image/heic', 'photo.heic')).toBe('file')
  expect(attachmentKind('video/x-matroska', 'film.mkv')).toBe('file')
})

test('previewKind is set only for what the preview dialog can show', () => {
  expect(previewKind('application/pdf', 'a.pdf')).toBe('pdf')
  expect(previewKind('', 'a.pdf')).toBe('pdf')
  expect(previewKind('image/png', 'a.png')).toBe('image')
  expect(previewKind('image/tiff', 'a.tif')).toBeNull()
  expect(previewKind('application/zip', 'a.zip')).toBeNull()
  expect(previewKind('application/msword', 'a.doc')).toBeNull()
})

test('fileIconKind groups files by what they are', () => {
  expect(fileIconKind('audio/mpeg', 'a.mp3')).toBe('audio')
  expect(fileIconKind('video/mp4', 'a.mp4')).toBe('video')
  expect(fileIconKind('image/png', 'a.png')).toBe('image')
  expect(fileIconKind('application/zip', 'a.zip')).toBe('archive')
  expect(fileIconKind('application/x-7z-compressed', 'a.7z')).toBe('archive')
  expect(fileIconKind('application/vnd.ms-excel', 'a.xlsx')).toBe('spreadsheet')
  expect(fileIconKind('application/pdf', 'a.pdf')).toBe('document')
  expect(fileIconKind('application/octet-stream', 'a.bin')).toBe('file')
})

test('fileTypeLabel names the type in plain words', () => {
  expect(fileTypeLabel('application/pdf', 'Report.pdf')).toBe('PDF')
  expect(fileTypeLabel('application/zip', 'bundle.zip')).toBe('ZIP archive')
  expect(fileTypeLabel('application/octet-stream', 'plan.docx')).toBe('Word document')
  expect(fileTypeLabel('audio/mpeg', 'song.mp3')).toBe('MP3 audio')
  expect(fileTypeLabel('audio/mpeg', 'song')).toBe('Audio')
  expect(fileTypeLabel('video/mp4', 'clip.mp4')).toBe('MP4 video')
  expect(fileTypeLabel('application/x-thing', 'thing.abc')).toBe('ABC')
  expect(fileTypeLabel('application/octet-stream', 'LICENSE')).toBe('File')
})

test('formatBytes uses one decimal and drops a trailing .0', () => {
  expect(formatBytes(0)).toBe('0 B')
  expect(formatBytes(999)).toBe('999 B')
  expect(formatBytes(1024)).toBe('1 KB')
  expect(formatBytes(1536)).toBe('1.5 KB')
  expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  expect(formatBytes(MAX_ATTACHMENT_BYTES)).toBe('100 MB')
  expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB')
  expect(formatBytes(-1)).toBe('')
  expect(formatBytes(NaN)).toBe('')
})

test('uploadProblem refuses only files over the server limit', () => {
  expect(uploadProblem({ name: 'song.wav', size: MAX_ATTACHMENT_BYTES })).toBeNull()
  expect(uploadProblem({ name: 'song.wav', size: MAX_ATTACHMENT_BYTES + 1 })).toBe("song.wav is larger than 100 MB and can't be attached.")
})

test('safeAttachmentUrl allows http(s) and site paths and nothing that can run', () => {
  expect(safeAttachmentUrl('https://example.com/rails/active_storage/blobs/x/a.pdf')).toBe('https://example.com/rails/active_storage/blobs/x/a.pdf')
  expect(safeAttachmentUrl(' http://localhost:3000/a.mp3 ')).toBe('http://localhost:3000/a.mp3')
  expect(safeAttachmentUrl('/rails/active_storage/blobs/x/a.pdf')).toBe('/rails/active_storage/blobs/x/a.pdf')
  expect(safeAttachmentUrl('javascript:alert(1)')).toBeNull()
  expect(safeAttachmentUrl('JavaScript:alert(1)')).toBeNull()
  expect(safeAttachmentUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  expect(safeAttachmentUrl('//evil.example/a.pdf')).toBeNull()
  expect(safeAttachmentUrl('/\\evil.example/a.pdf')).toBeNull()
  expect(safeAttachmentUrl('relative/path.pdf')).toBeNull()
  expect(safeAttachmentUrl('')).toBeNull()
  expect(safeAttachmentUrl(null)).toBeNull()
  expect(safeAttachmentUrl(42)).toBeNull()
})

test('downloadUrl asks Active Storage for a download', () => {
  expect(downloadUrl('https://x.test/a.pdf')).toBe('https://x.test/a.pdf?disposition=attachment')
  expect(downloadUrl('https://x.test/a.pdf?v=1')).toBe('https://x.test/a.pdf?v=1&disposition=attachment')
})

test('attachmentContent turns an upload into the right node', () => {
  const upload = (content_type: string, filename: string) => ({ url: 'https://x.test/f', filename, content_type, byte_size: 2048 })
  expect(attachmentContent(upload('image/png', 'pic.png'))).toEqual({ type: 'image', attrs: { src: 'https://x.test/f', alt: 'pic.png' } })
  expect(attachmentContent(upload('video/mp4', 'clip.mp4'))).toEqual({ type: 'video', attrs: { src: 'https://x.test/f' } })
  expect(attachmentContent(upload('audio/flac', 'song.flac'))).toEqual({
    type: 'audio',
    attrs: { src: 'https://x.test/f', name: 'song.flac', size: 2048, type: 'audio/flac' },
  })
  expect(attachmentContent(upload('application/pdf', 'plan.pdf'))).toEqual({
    type: 'fileAttachment',
    attrs: { src: 'https://x.test/f', name: 'plan.pdf', size: 2048, type: 'application/pdf' },
  })
  expect(attachmentContent(upload('application/octet-stream', 'plan.bin')).type).toBe('fileAttachment')
})

test('attachmentAttrsFromElement reads the stored attributes back', () => {
  const element = (attrs: Record<string, string>) => ({ getAttribute: (name: string) => attrs[name] ?? null })
  expect(attachmentAttrsFromElement(element({ src: 'https://x.test/a.mp3', 'data-name': 'a.mp3', 'data-size': '2048', 'data-file-type': 'audio/mpeg' })))
    .toEqual({ src: 'https://x.test/a.mp3', name: 'a.mp3', size: 2048, type: 'audio/mpeg' })
  expect(attachmentAttrsFromElement(element({ 'data-src': 'https://x.test/a.zip', 'data-size': 'abc' })))
    .toEqual({ src: 'https://x.test/a.zip', name: null, size: null, type: null })
  expect(attachmentAttrsFromElement(element({}))).toEqual({ src: null, name: null, size: null, type: null })
})

test('pastedFiles uploads screenshots and copied files but leaves rich text alone', () => {
  const file = { name: 'shot.png' }
  expect(pastedFiles({ files: [file], types: ['Files'] })).toEqual([file])
  expect(pastedFiles({ files: [file], types: ['text/plain', 'Files'] })).toEqual([file])
  expect(pastedFiles({ files: [file], types: ['text/html', 'text/plain', 'Files'] })).toEqual([])
  expect(pastedFiles({ files: [], types: ['text/plain'] })).toEqual([])
  expect(pastedFiles(null)).toEqual([])
  expect(pastedFiles(undefined)).toEqual([])
})
