import { DATE_TRIGGER, dateAnchor, dateEntryTitle, dateIdFromAnchor, dateIdsIn, dateLabel, documentDatePath, documentDatePayload, findDatePos, removedDateIds, removedDatesMessage, triggerDate } from './documentDate'

const match = (text: string) => DATE_TRIGGER.exec(text) as RegExpMatchArray

test('the trigger is /date, @date or @YYYY-MM-DD followed by a space, at a line start or after a space', () => {
  expect(DATE_TRIGGER.test('/date ')).toBe(true)
  expect(DATE_TRIGGER.test('Ship it @date ')).toBe(true)
  expect(DATE_TRIGGER.test('@2026-12-01 ')).toBe(true)
  expect(DATE_TRIGGER.test('@date')).toBe(false)
  expect(DATE_TRIGGER.test('me@date ')).toBe(false)
  expect(DATE_TRIGGER.test('/event ')).toBe(false)
  expect(DATE_TRIGGER.test('@2026-12-1 ')).toBe(false)
})

test('the character before the trigger is kept for the editor to leave in place', () => {
  expect(match('Ship it @date ')[1]).toBe(' ')
  expect(match('@date ')[1]).toBe('')
})

test('a typed day is returned only when it is a real day', () => {
  expect(triggerDate(match('@2026-12-01 '))).toBe('2026-12-01')
  expect(triggerDate(match('@2026-02-31 '))).toBeNull()
  expect(triggerDate(match('@date '))).toBeNull()
  expect(triggerDate(match('/date '))).toBeNull()
})

test('a new entry is labelled with its line, or the document title when the line is empty', () => {
  expect(dateLabel('  Ship   the beta \n now ', 'Launch plan')).toBe('Ship the beta now')
  expect(dateLabel('   ', ' Launch  plan ')).toBe('Launch plan')
  expect(dateLabel('', '')).toBe('')
  const long = dateLabel('word '.repeat(60), 'Launch plan')
  expect(long.length).toBeLessThanOrEqual(120)
  expect(long.endsWith('…')).toBe(true)
})

test('a calendar entry shows its label, then its document, then "Date"', () => {
  expect(dateEntryTitle({ label: 'Ship', document_title: 'Plan' })).toBe('Ship')
  expect(dateEntryTitle({ label: ' ', document_title: 'Plan' })).toBe('Plan')
  expect(dateEntryTitle({ label: '', document_title: null })).toBe('Date')
})

test('a chip is addressed by "date=<id>" in the hash, which no heading anchor can be', () => {
  expect(dateAnchor(34)).toBe('date=34')
  expect(dateIdFromAnchor('date=34')).toBe(34)
  expect(dateIdFromAnchor('launch-plan')).toBeNull()
  expect(dateIdFromAnchor('date-34')).toBeNull()
  expect(dateIdFromAnchor('date=x')).toBeNull()
  expect(dateIdFromAnchor(null)).toBeNull()
})

test('an entry links to its chip in the document, or nowhere once unlinked', () => {
  expect(documentDatePath({ id: 34, document_id: 12 })).toBe('/documents/12#date%3D34')
  expect(documentDatePath({ id: 34, document_id: null })).toBeNull()
})

// A stand-in for a ProseMirror document: the chips and other nodes in order, with their positions.
const fakeDoc = (nodes: { name: string; attrs?: Record<string, unknown>; pos: number }[]) => ({
  descendants: (visit: (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => boolean | void) => {
    for (const n of nodes) visit({ type: { name: n.name }, attrs: n.attrs ?? {} }, n.pos)
  },
})

test('finds the date chips anywhere in a document, once each', () => {
  const doc = fakeDoc([
    { name: 'heading', pos: 0 },
    { name: 'documentDate', attrs: { dateId: 7 }, pos: 5 },
    { name: 'documentDate', attrs: { dateId: 8 }, pos: 9 },
    { name: 'documentDate', attrs: { dateId: 7 }, pos: 12 },
    { name: 'documentDate', attrs: { dateId: null }, pos: 15 },
  ])
  expect([...dateIdsIn(doc)]).toEqual([7, 8])
  expect(dateIdsIn(fakeDoc([])).size).toBe(0)
})

test('removed dates are chips that went away while their entry is still linked to the document', () => {
  expect(removedDateIds(new Set([1, 2, 3]), new Set([1]), new Set([1, 2]))).toEqual([2])
  expect(removedDateIds(new Set(), new Set([1]), new Set([1]))).toEqual([])
  // Cut and pasted somewhere else: the chip is back by the time we look.
  expect(removedDateIds(new Set([1]), new Set([1]), new Set([1]))).toEqual([])
})

test('says what was removed, for one date and for several', () => {
  expect(removedDatesMessage([{ date: '2026-12-01', label: 'Ship the beta' }])).toBe('You removed the line with 2026-12-01 (“Ship the beta”). Its entry is still on the calendar.')
  expect(removedDatesMessage([{ date: '2026-12-01', label: '' }])).toBe('You removed the line with 2026-12-01. Its entry is still on the calendar.')
  expect(removedDatesMessage([{ date: '2026-12-01', label: 'a' }, { date: '2026-12-02', label: 'b' }])).toBe('You removed 2 dates from this document: 2026-12-01, 2026-12-02. Their entries are still on the calendar.')
})

test('finds the position of the chip for an entry, or null when it is not in the document', () => {
  const doc = fakeDoc([{ name: 'paragraph', pos: 0 }, { name: 'documentDate', attrs: { dateId: 7 }, pos: 5 }, { name: 'documentDate', attrs: { dateId: 8 }, pos: 9 }])
  expect(findDatePos(doc, 8)).toBe(9)
  expect(findDatePos(doc, 99)).toBeNull()
})

test('the request for a new date names the document and trims the label', () => {
  expect(documentDatePayload('2026-12-01', ' Ship ', 9)).toEqual({ date: '2026-12-01', label: 'Ship', document_id: 9 })
})
