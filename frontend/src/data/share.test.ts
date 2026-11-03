import {
  DEFAULT_EXPIRY, EXPIRY_CHOICES, canShareDocType, expiryText, folderOutline, permissionText, sharedContent,
  sharedDocumentPath, sharedUrl, unavailableText, type SharedFolder,
} from './share'

test('builds the public link from the origin and token', () => {
  expect(sharedUrl('https://app.example.com', 'abc123')).toBe('https://app.example.com/shared/abc123')
})

test('builds the path of a document inside a shared folder', () => {
  expect(sharedDocumentPath('abc123', 7)).toBe('/shared/abc123/documents/7')
})

test('only rich-text documents can be shared by link', () => {
  expect(canShareDocType('document')).toBe(true)
  expect(['spreadsheet', 'table', 'file'].some(canShareDocType)).toBe(false)
})

test('a new link expires in 30 days unless the person picks otherwise', () => {
  expect(EXPIRY_CHOICES.map((c) => c.value)).toContain(DEFAULT_EXPIRY)
  expect(EXPIRY_CHOICES.find((c) => c.value === '')?.label).toBe('Never')
})

test('says when a link expires, or that it already has', () => {
  const now = new Date('2026-11-03T12:00:00Z')
  expect(expiryText(null, now)).toBe('Never expires')
  expect(expiryText('2026-11-10T12:00:00Z', now)).toBe('Expires Nov 10, 2026')
  expect(expiryText('2026-11-03T11:00:00Z', now)).toBe('Expired')
})

test('every link is view only, even an old edit link', () => {
  expect(permissionText('view')).toBe('View only')
  expect(permissionText('edit')).toMatch(/^View only/)
})

const shared: SharedFolder = {
  folder: { id: 1, name: 'Plans', icon: null },
  folders: [
    { id: 2, name: 'Q1', icon: null, parent_id: 1 },
    { id: 3, name: 'Q1 notes', icon: null, parent_id: 2 },
    { id: 4, name: 'Empty', icon: null, parent_id: 1 },
    { id: 5, name: 'Only inside', icon: null, parent_id: 4 },
  ],
  documents: [
    { id: 10, title: 'Top', folder_id: 1, updated_at: '2026-11-01T00:00:00Z' },
    { id: 11, title: 'Deep', folder_id: 3, updated_at: '2026-11-01T00:00:00Z' },
  ],
  truncated: false,
}

test('outlines a shared folder: its documents, then subfolders with something to read', () => {
  const outline = folderOutline(shared)
  expect(outline.folder.name).toBe('Plans')
  expect(outline.documents.map((d) => d.title)).toEqual(['Top'])
  expect(outline.children.map((c) => c.folder.name)).toEqual(['Q1'])
  expect(outline.children[0].documents).toEqual([])
  expect(outline.children[0].children[0].documents.map((d) => d.title)).toEqual(['Deep'])
})

test('a folder with nothing to read has an empty outline', () => {
  const outline = folderOutline({ ...shared, folders: [], documents: [] })
  expect(outline.documents).toEqual([])
  expect(outline.children).toEqual([])
})

test('a document with no text shows as empty', () => {
  expect(sharedContent({})).toBeNull()
  expect(sharedContent(null)).toBeNull()
  expect(sharedContent({ type: 'doc', content: [] })).toEqual({ type: 'doc', content: [] })
})

test('an unknown, turned-off or expired link reads the same; other failures say what to do', () => {
  expect(unavailableText(404)).toMatch(/isn.t available/)
  expect(unavailableText(404)).toMatch(/turned off or may have expired/)
  expect(unavailableText(429)).toMatch(/Try again in a minute/)
  expect(unavailableText(undefined)).toMatch(/Check your connection/)
  expect(unavailableText(500)).toMatch(/Check your connection/)
})
