import { CsvError, exportFileName, neutralizeRows, parseCsv, toCsv, type CsvCell } from '@/util/csv'
import { XLSX_MIME, XlsxError, buildXlsx, parseXlsx } from '@/util/xlsx'
import { ZipError } from '@/util/zip'
import { EXPORT_FORMATS, type ExportFormat } from '@/data/exportFormat'

// Browser file helpers for importing and exporting spreadsheets as CSV or Excel.
// Kept apart from util/csv.ts and util/xlsx.ts so those files stay pure.

// Saves bytes or text through the browser's download.
export function saveFile(fileName: string, parts: BlobPart[], mime: string): void {
  const url = URL.createObjectURL(new Blob(parts, { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Downloads rows (header row first) as "<title>.csv" or "<title>.xlsx". The CSV
// starts with a byte-order mark so Excel reads it as UTF-8 (accents, symbols)
// instead of the local code page, and its text cells are made safe against
// being run as formulas. The workbook's sheet is named for the title.
export function downloadRows(format: ExportFormat, title: string, rows: CsvCell[][], fallbackName = 'export'): void {
  const { extension } = EXPORT_FORMATS.find((candidate) => candidate.key === format)!
  const fileName = exportFileName(title, extension, fallbackName)
  if (format === 'xlsx') saveFile(fileName, [buildXlsx(rows, title) as BlobPart], XLSX_MIME)
  else saveFile(fileName, ['\uFEFF', toCsv(neutralizeRows(rows))], 'text/csv;charset=utf-8')
}

// A chosen file's bytes.
export function readFileBytes(file: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the file.'))
    reader.readAsArrayBuffer(file)
  })
}

// A file that cannot be read as a table; the message says why, in words for the person.
export class TableFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TableFileError'
  }
}

export interface TableFile {
  rows: string[][]
  // Some bytes were not valid UTF-8 (a CSV saved in a local code page).
  garbled: boolean
}

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => bytes[index] === byte)

// Reads a CSV, TSV or Excel (.xlsx) file as rows of text. What the file is
// comes from its content, not its name: an .xlsx is a ZIP ("PK"), the old
// binary .xls is not supported.
export async function readTableFile(file: Blob): Promise<TableFile> {
  try {
    const bytes = await readFileBytes(file)
    if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return { rows: await parseXlsx(bytes), garbled: false }
    if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
      throw new TableFileError('That is an old Excel (.xls) file. Open it in Excel and save it as a workbook (.xlsx) or as CSV, then choose that.')
    }
    const text = new TextDecoder().decode(bytes)
    return { rows: parseCsv(text), garbled: text.includes('\uFFFD') }
  } catch (e) {
    if (e instanceof TableFileError) throw e
    throw new TableFileError(e instanceof CsvError || e instanceof XlsxError || e instanceof ZipError ? e.message : 'Unable to read that file.')
  }
}
