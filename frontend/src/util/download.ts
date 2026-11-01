import { csvFileName, toCsv, type CsvCell } from '@/util/csv'

// Browser file helpers for CSV import and export. Kept apart from util/csv.ts so
// that file stays pure.

// Saves text through the browser's download. The byte-order mark makes Excel read
// the file as UTF-8 (accents, symbols) instead of the local code page.
export function downloadTextFile(fileName: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Downloads rows as "<title>.csv".
export function downloadCsv(title: string, rows: CsvCell[][], fallbackName?: string): void {
  downloadTextFile(csvFileName(title, fallbackName), toCsv(rows))
}

// A chosen file's text (UTF-8; a byte-order mark is dropped by the reader).
export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the file.'))
    reader.readAsText(file)
  })
}
