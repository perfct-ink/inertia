// Just enough of the ZIP format to write and read an Excel (.xlsx) file, which
// is a ZIP of XML parts. Writing stores entries uncompressed; reading also
// inflates the compressed entries other programs write, with the browser's own
// DecompressionStream. Pure functions apart from that one default, so they can
// be unit tested without a browser.

export interface ZipEntry { name: string; data: Uint8Array }
export type Inflate = (compressed: Uint8Array, maxBytes: number) => Promise<Uint8Array>

export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

const LOCAL_HEADER = 0x04034b50
const CENTRAL_HEADER = 0x02014b50
const END_OF_DIRECTORY = 0x06054b50
const STORED = 0
const DEFLATED = 8
const UTF8_NAMES = 0x0800
// 1980-01-01 00:00, the earliest time a ZIP can hold: entries carry no real timestamp.
const DOS_DATE = 0x0021

const encoder = new TextEncoder()
const decoder = new TextDecoder()

let crcTable: Uint32Array | null = null

export function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ── Writing ──────────────────────────────────────────────────────────────────

// A ZIP with every entry stored as it is (no compression). Spreadsheets this
// size gain little from compression, and storing keeps the writer dependency-free.
export function zipStored(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = []
  const directory: Uint8Array[] = []
  let offset = 0
  for (const { name, data } of entries) {
    const nameBytes = encoder.encode(name)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, LOCAL_HEADER, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, UTF8_NAMES, true)
    local.setUint16(8, STORED, true)
    local.setUint16(10, 0, true) // time
    local.setUint16(12, DOS_DATE, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)

    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, CENTRAL_HEADER, true)
    central.setUint16(4, 20, true) // version made by
    central.setUint16(6, 20, true) // version needed
    central.setUint16(8, UTF8_NAMES, true)
    central.setUint16(10, STORED, true)
    central.setUint16(12, 0, true)
    central.setUint16(14, DOS_DATE, true)
    central.setUint32(16, crc, true)
    central.setUint32(20, data.length, true)
    central.setUint32(24, data.length, true)
    central.setUint16(28, nameBytes.length, true)
    central.setUint32(42, offset, true)
    directory.push(new Uint8Array(central.buffer), nameBytes)

    offset += 30 + nameBytes.length + data.length
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, END_OF_DIRECTORY, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)
  return concat([...parts, ...directory, new Uint8Array(end.buffer)])
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let position = 0
  for (const part of parts) { out.set(part, position); position += part.length }
  return out
}

// ── Reading ──────────────────────────────────────────────────────────────────

// Inflates raw-deflate data with the browser, stopping if it grows past maxBytes
// (a small file can claim to unpack to gigabytes).
export const inflateWithBrowser: Inflate = async (compressed, maxBytes) => {
  const Decompression = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream
  if (!Decompression) throw new ZipError('This browser cannot open Excel files. Save the sheet as CSV and choose that instead.')
  const stream = new Blob([compressed as BlobPart]).stream().pipeThrough(new Decompression('deflate-raw'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > maxBytes) { await reader.cancel(); throw new ZipError('That file unpacks to more data than can be imported. Split it into smaller files.') }
    chunks.push(value)
  }
  return concat(chunks)
}

interface CentralEntry { name: string; method: number; compressedSize: number; size: number; offset: number }

// The entries of a ZIP, read on demand: only the parts asked for are inflated.
export interface ZipArchive {
  has(name: string): boolean
  read(name: string): Promise<Uint8Array | null>
  text(name: string): Promise<string | null>
}

export function openZip(bytes: Uint8Array, options: { inflate?: Inflate; maxEntryBytes?: number } = {}): ZipArchive {
  const { inflate = inflateWithBrowser, maxEntryBytes = 20 * 1024 * 1024 } = options
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const entries = new Map<string, CentralEntry>()

  // The end-of-directory record is the last 22 bytes, or earlier when the ZIP has a comment.
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === END_OF_DIRECTORY) { end = i; break }
  }
  if (end < 0) throw new ZipError('That file is not a valid Excel (.xlsx) file.')
  const count = view.getUint16(end + 10, true)
  let position = view.getUint32(end + 16, true)
  if (count === 0xffff || position === 0xffffffff) throw new ZipError('That Excel file is too large to open here. Save the sheet as CSV instead.')

  for (let i = 0; i < count; i++) {
    if (position + 46 > bytes.length || view.getUint32(position, true) !== CENTRAL_HEADER) throw new ZipError('That file is not a valid Excel (.xlsx) file.')
    const flags = view.getUint16(position + 8, true)
    const nameLength = view.getUint16(position + 28, true)
    const extraLength = view.getUint16(position + 30, true)
    const commentLength = view.getUint16(position + 32, true)
    if (flags & 1) throw new ZipError('That Excel file is password protected. Remove the password and try again.')
    const name = decoder.decode(bytes.subarray(position + 46, position + 46 + nameLength))
    entries.set(name, {
      name,
      method: view.getUint16(position + 10, true),
      compressedSize: view.getUint32(position + 20, true),
      size: view.getUint32(position + 24, true),
      offset: view.getUint32(position + 42, true),
    })
    position += 46 + nameLength + extraLength + commentLength
  }

  async function read(name: string): Promise<Uint8Array | null> {
    const entry = entries.get(name)
    if (!entry) return null
    if (entry.size > maxEntryBytes) throw new ZipError('That file unpacks to more data than can be imported. Split it into smaller files.')
    if (entry.offset + 30 > bytes.length || view.getUint32(entry.offset, true) !== LOCAL_HEADER) throw new ZipError('That file is not a valid Excel (.xlsx) file.')
    // The local header repeats the name and may carry its own extra data, so the data starts after both.
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true)
    const raw = bytes.subarray(start, start + entry.compressedSize)
    if (raw.length !== entry.compressedSize) throw new ZipError('That file is cut short or damaged.')
    if (entry.method === STORED) return raw
    if (entry.method === DEFLATED) return inflate(raw, maxEntryBytes)
    throw new ZipError('That Excel file uses a compression this app cannot read. Save the sheet as CSV instead.')
  }

  return {
    has: (name) => entries.has(name),
    read,
    text: async (name) => {
      const data = await read(name)
      return data ? decoder.decode(data) : null
    },
  }
}
