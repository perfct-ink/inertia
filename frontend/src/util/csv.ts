// CSV reading and writing (RFC 4180 with the usual spreadsheet leniencies).
// Pure functions only, so they can be unit tested without a browser.

export type CsvCell = string | number | boolean | null | undefined
export type Delimiter = ',' | ';' | '\t'

const DELIMITERS: Delimiter[] = [',', ';', '\t']
const BYTE_ORDER_MARK = /^\uFEFF/

export class CsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvError'
  }
}

// Spreadsheets in many locales save with ";" (or tabs) instead of ",". The
// delimiter is whichever appears most in the first record, outside quotes.
export function detectDelimiter(text: string): Delimiter {
  const counts = new Map<Delimiter, number>(DELIMITERS.map((d) => [d, 0]))
  let quoted = false
  for (const char of text.replace(BYTE_ORDER_MARK, '')) {
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === '\n' || char === '\r')) break
    else if (!quoted && counts.has(char as Delimiter)) counts.set(char as Delimiter, counts.get(char as Delimiter)! + 1)
  }
  let best: Delimiter = ','
  counts.forEach((count, delimiter) => { if (count > counts.get(best)!) best = delimiter })
  return best
}

// Rows of cells. A leading byte-order mark, CRLF/LF/CR line ends, quoted
// cells with doubled quotes and line breaks inside quotes are handled; blank
// lines are dropped. Throws CsvError when a quote is never closed.
export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const source = text.replace(BYTE_ORDER_MARK, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false // inside a quoted cell
  let wasQuoted = false // the current cell began with a quote
  let line = 1
  let quoteLine = 1

  function endCell() { row.push(cell); cell = ''; wasQuoted = false }
  function endRow() {
    const blank = row.length === 0 && cell === '' && !wasQuoted
    if (!blank) { endCell(); rows.push(row) }
    row = []
    cell = ''
    wasQuoted = false
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else {
        if (char === '\n') line++
        cell += char
      }
    } else if (char === '"' && cell === '' && !wasQuoted) {
      quoted = true; wasQuoted = true; quoteLine = line
    } else if (char === delimiter) {
      endCell()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      line++
      endRow()
    } else {
      cell += char
    }
  }
  if (quoted) throw new CsvError(`The file ends inside a quoted cell that starts on line ${quoteLine}. Check for a missing closing quote.`)
  endRow()
  return rows
}

function cellText(value: CsvCell): string {
  return value === null || value === undefined ? '' : String(value)
}

function escapeCell(value: CsvCell, delimiter: Delimiter): string {
  const text = cellText(value)
  return text.includes('"') || text.includes(delimiter) || /[\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// CRLF-separated rows; cells are quoted only when they need to be.
export function toCsv(rows: CsvCell[][], delimiter: Delimiter = ','): string {
  return rows.map((row) => row.map((value) => escapeCell(value, delimiter)).join(delimiter)).join('\r\n')
}

// Excel and Sheets run a cell that starts with = + - @ (or a tab or return) as
// a formula, which lets whoever typed it act on the person who opens the
// export. Text cells are written with a leading apostrophe instead.
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

// "Q3 plan / draft" -> "Q3_plan_draft.csv": safe on every file system.
export function csvFileName(title: string, fallback = 'export'): string {
  const base = title.trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/^\.+/, '')
  return `${base || fallback}.csv`
}
