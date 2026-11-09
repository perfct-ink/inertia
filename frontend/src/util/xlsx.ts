import { openZip, zipStored, type Inflate } from '@/util/zip'
import type { CsvCell } from '@/util/csv'

// Reading and writing Excel (.xlsx) workbooks without a spreadsheet library.
// An .xlsx is a ZIP of XML parts (util/zip.ts); only one plain worksheet of
// text, numbers, booleans and dates is written, and the first worksheet is read.
// Pure apart from DOMParser (browsers and Jest's jsdom both have it).

export class XlsxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XlsxError'
  }
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
// Excel's own limits on a cell and on a sheet's name.
const MAX_CELL_CHARS = 32767
const MAX_SHEET_NAME = 31
// What a sheet read here may hold, so a file of millions of empty styled cells cannot freeze the page.
export const MAX_SHEET_ROWS = 50_000
export const MAX_SHEET_COLUMNS = 1000

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL_DOC = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_REL_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships'
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// ── Writing ──────────────────────────────────────────────────────────────────

// Characters XML 1.0 cannot hold (most control characters), dropped from text.
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

function escapeXml(text: string): string {
  return text.replace(XML_INVALID, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 0 -> "A", 25 -> "Z", 26 -> "AA".
export function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

// "C7" -> 2 (the zero-based column).
export function columnIndex(reference: string): number {
  const letters = /^[A-Za-z]+/.exec(reference)?.[0] ?? ''
  let index = 0
  for (const letter of letters.toUpperCase()) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

// A name Excel accepts for the sheet tab.
export function sheetTabName(title: string): string {
  const name = title.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^'+|'+$/g, '').slice(0, MAX_SHEET_NAME).trim()
  return name || 'Sheet1'
}

function cellXml(value: CsvCell, reference: string, style: string): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return Number.isFinite(value) ? `<c r="${reference}"${style}><v>${value}</v></c>` : ''
  if (typeof value === 'boolean') return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value.slice(0, MAX_CELL_CHARS))}</t></is></c>`
}

function columnWidths(rows: CsvCell[][]): string {
  const longest: number[] = []
  for (const row of rows) {
    row.forEach((value, index) => {
      const longestLine = String(value ?? '').split('\n').reduce((most, line) => Math.max(most, line.length), 0)
      longest[index] = Math.max(longest[index] ?? 0, longestLine)
    })
  }
  if (longest.length === 0) return ''
  const columns = longest.map((length, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(Math.max(length + 2, 8), 60)}" customWidth="1"/>`)
  return `<cols>${columns.join('')}</cols>`
}

function sheetXml(rows: CsvCell[][]): string {
  const body = rows.map((row, rowIndex) => {
    // The first row is the header: bold (style 1).
    const style = rowIndex === 0 ? ' s="1"' : ''
    const cells = row.map((value, column) => cellXml(value, `${columnName(column)}${rowIndex + 1}`, style)).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const frozen = rows.length > 1 ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : ''
  return `${XML_HEADER}<worksheet xmlns="${NS_MAIN}"><sheetViews><sheetView workbookViewId="0">${frozen}</sheetView></sheetViews>${columnWidths(rows)}<sheetData>${body}</sheetData></worksheet>`
}

const CONTENT_TYPES = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + '</Types>'

const ROOT_RELS = `${XML_HEADER}<Relationships xmlns="${NS_REL_PKG}">`
  + `<Relationship Id="rId1" Type="${NS_REL_DOC}/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const WORKBOOK_RELS = `${XML_HEADER}<Relationships xmlns="${NS_REL_PKG}">`
  + `<Relationship Id="rId1" Type="${NS_REL_DOC}/worksheet" Target="worksheets/sheet1.xml"/>`
  + `<Relationship Id="rId2" Type="${NS_REL_DOC}/styles" Target="styles.xml"/></Relationships>`

// Style 0 is plain; style 1 is bold, for the header row.
const STYLES = `${XML_HEADER}<styleSheet xmlns="${NS_MAIN}">`
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

// A workbook with one sheet. Text goes in as text (so a cell starting with "="
// is never run as a formula), numbers and booleans keep their type, empty
// values leave the cell empty, and the first row is a bold, frozen header.
export function buildXlsx(rows: CsvCell[][], sheetName = 'Sheet1'): Uint8Array {
  const workbook = `${XML_HEADER}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL_DOC}">`
    + `<sheets><sheet name="${escapeXml(sheetTabName(sheetName))}" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const encoder = new TextEncoder()
  return zipStored([
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: encoder.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: encoder.encode(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(sheetXml(rows)) },
  ])
}

// ── Reading ──────────────────────────────────────────────────────────────────

function parseXml(text: string): Document {
  let xml: Document
  try {
    xml = new DOMParser().parseFromString(text, 'application/xml')
  } catch {
    throw new XlsxError('That Excel file is damaged: part of it is not readable.')
  }
  if (xml.getElementsByTagName('parsererror').length > 0) throw new XlsxError('That Excel file is damaged: part of it is not readable.')
  return xml
}

// Elements by local name, whatever namespace prefix the writer used.
function elements(scope: Document | Element, name: string): Element[] {
  return Array.from(scope.getElementsByTagNameNS('*', name))
}

function child(scope: Element, name: string): Element | undefined {
  return Array.from(scope.children).find((node) => node.localName === name)
}

// The text of a string item or inline string: its plain or rich-text runs
// joined, without the phonetic hints (rPh) East Asian files carry.
function richText(item: Element): string {
  return elements(item, 't')
    .filter((t) => {
      for (let node = t.parentElement; node && node !== item; node = node.parentElement) if (node.localName === 'rPh') return false
      return true
    })
    .map((t) => t.textContent ?? '')
    .join('')
}

// Built-in number formats that show a date or a time.
const BUILT_IN_DATE_FORMATS = new Set([...range(14, 22), ...range(27, 36), ...range(45, 47), ...range(50, 58)])

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

// A custom format shows a date or time when, outside quoted text, colours and
// escapes, it uses a year, month, day, hour or second code.
export function isDateFormatCode(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, '').replace(/\[(?!(?:h+|m+|s+)\])[^\]]*\]/gi, '').replace(/\\.|_.|\*./g, '')
  return /[ymdhs]/i.test(bare)
}

// Which cell styles (by the `s` index of a cell) format their number as a date.
function dateStyles(styles: Document | null): Set<number> {
  const result = new Set<number>()
  if (!styles) return result
  const custom = new Map<number, string>()
  elements(styles, 'numFmt').forEach((fmt) => custom.set(Number(fmt.getAttribute('numFmtId')), fmt.getAttribute('formatCode') ?? ''))
  const cellXfs = elements(styles, 'cellXfs')[0]
  if (!cellXfs) return result
  Array.from(cellXfs.children).forEach((xf, index) => {
    const id = Number(xf.getAttribute('numFmtId') ?? 0)
    if (BUILT_IN_DATE_FORMATS.has(id) || (custom.has(id) && isDateFormatCode(custom.get(id)!))) result.add(index)
  })
  return result
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

// Excel keeps a date as days since an epoch and a time as the fraction of a day.
// "2026-11-01" for a whole day, "2026-11-01 09:30:00" with a time, "09:30:00"
// for a time alone. Excel's 1900 system counts a 29 February 1900 that never
// existed, so serials from 60 on count from 1899-12-30 and earlier ones from
// 1899-12-31.
export function serialToText(serial: number, date1904 = false): string {
  let days = Math.floor(serial)
  let seconds = Math.round((serial - days) * 86400)
  if (seconds === 86400) { days += 1; seconds = 0 }
  const time = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`
  if (serial >= 0 && serial < 1) return time
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : days < 60 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30)
  const date = new Date(epoch + days * 86_400_000)
  const text = `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  return seconds === 0 ? text : `${text} ${time}`
}

// Numbers are written the way a spreadsheet shows them, never in exponent form.
function numberText(raw: string): string {
  const text = raw.trim()
  if (!/[eE]/.test(text)) return text
  const value = Number(text)
  return Number.isFinite(value) ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : text
}

function sheetPathFor(workbook: Document, rels: Document | null): string {
  const first = elements(workbook, 'sheet')[0]
  const id = first?.getAttributeNS(NS_REL_DOC, 'id') ?? first?.getAttribute('r:id') ?? null
  const rel = rels && id ? elements(rels, 'Relationship').find((node) => node.getAttribute('Id') === id) : undefined
  const target = rel?.getAttribute('Target')
  if (!target) return 'xl/worksheets/sheet1.xml'
  const parts = (target.startsWith('/') ? target.slice(1) : `xl/${target}`).split('/')
  const resolved: string[] = []
  parts.forEach((part) => { if (part === '..') resolved.pop(); else if (part !== '.') resolved.push(part) })
  return resolved.join('/')
}

export interface XlsxOptions { inflate?: Inflate; maxEntryBytes?: number }

// The first worksheet as rows of text, in the shape parseCsv gives, so one
// import handles both. Dates and times come back as "YYYY-MM-DD[ HH:MM:SS]",
// booleans as "true"/"false"; formulas give their last calculated value. Blank
// rows are dropped and rows are as wide as their last filled cell.
export async function parseXlsx(bytes: Uint8Array, options: XlsxOptions = {}): Promise<string[][]> {
  const zip = openZip(bytes, options)
  const workbookText = await zip.text('xl/workbook.xml')
  if (workbookText === null) throw new XlsxError('That file is not an Excel workbook (.xlsx).')
  const workbook = parseXml(workbookText)
  const relsText = await zip.text('xl/_rels/workbook.xml.rels')
  const sheetText = await zip.text(sheetPathFor(workbook, relsText === null ? null : parseXml(relsText)))
  if (sheetText === null) throw new XlsxError('That workbook has no sheet to read.')
  const sharedText = await zip.text('xl/sharedStrings.xml')
  const stylesText = await zip.text('xl/styles.xml')

  const shared = sharedText === null ? [] : elements(parseXml(sharedText), 'si').map(richText)
  const dateStyle = dateStyles(stylesText === null ? null : parseXml(stylesText))
  const workbookPr = elements(workbook, 'workbookPr')[0]
  const date1904 = ['1', 'true'].includes(workbookPr?.getAttribute('date1904') ?? '')

  const rows: string[][] = []
  let rowNumber = 0
  for (const row of elements(parseXml(sheetText), 'row')) {
    rowNumber = row.hasAttribute('r') ? Number(row.getAttribute('r')) : rowNumber + 1
    if (!Number.isInteger(rowNumber) || rowNumber < 1) continue
    if (rowNumber > MAX_SHEET_ROWS) throw new XlsxError(`That sheet has more than ${MAX_SHEET_ROWS} rows. Split it into smaller files.`)
    const cells: string[] = []
    let column = -1
    for (const cell of Array.from(row.children).filter((node) => node.localName === 'c')) {
      column = cell.hasAttribute('r') ? columnIndex(cell.getAttribute('r')!) : column + 1
      if (column < 0 || column >= MAX_SHEET_COLUMNS) throw new XlsxError(`That sheet has more than ${MAX_SHEET_COLUMNS} columns.`)
      const text = cellText(cell, shared, dateStyle, date1904)
      if (text !== '') cells[column] = text
    }
    if (cells.length === 0) continue
    rows[rowNumber - 1] = Array.from(cells, (value) => value ?? '')
  }
  // Rows keep their sheet position until now so that "r" decides the order; blank rows go.
  return rows.filter((row) => row !== undefined)
}

function cellText(cell: Element, shared: string[], dateStyle: Set<number>, date1904: boolean): string {
  const type = cell.getAttribute('t') ?? 'n'
  const raw = child(cell, 'v')?.textContent ?? ''
  switch (type) {
    case 's': return shared[Number(raw)] ?? ''
    case 'inlineStr': { const inline = child(cell, 'is'); return inline ? richText(inline) : raw }
    case 'b': {
      const flag = raw.trim().toLowerCase()
      return flag === '' ? '' : flag === '1' || flag === 'true' ? 'true' : 'false'
    }
    case 'e': return ''
    case 'n': {
      if (raw.trim() === '') return ''
      const style = Number(cell.getAttribute('s') ?? 0)
      const value = Number(raw)
      return dateStyle.has(style) && Number.isFinite(value) ? serialToText(value, date1904) : numberText(raw)
    }
    default: return raw
  }
}
