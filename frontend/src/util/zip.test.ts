import { deflateRawSync, inflateRawSync } from 'zlib'
import { ZipError, crc32, openZip, zipStored, type ZipEntry } from './zip'

const encoder = new TextEncoder()
const entry = (name: string, text: string): ZipEntry => ({ name, data: encoder.encode(text) })

// One entry written the way most programs do, compressed with deflate (method 8),
// with a data descriptor flag and an extra field in the local header.
function deflatedZip(name: string, text: string): Uint8Array {
  const nameBytes = encoder.encode(name)
  const raw = encoder.encode(text)
  const packed = new Uint8Array(deflateRawSync(raw))
  const extra = new Uint8Array([0xca, 0xfe, 0x02, 0x00, 0x01, 0x02])
  const local = new DataView(new ArrayBuffer(30))
  local.setUint32(0, 0x04034b50, true)
  local.setUint16(8, 8, true)
  local.setUint32(14, crc32(raw), true)
  local.setUint32(18, packed.length, true)
  local.setUint32(22, raw.length, true)
  local.setUint16(26, nameBytes.length, true)
  local.setUint16(28, extra.length, true)
  const central = new DataView(new ArrayBuffer(46))
  central.setUint32(0, 0x02014b50, true)
  central.setUint16(10, 8, true)
  central.setUint32(16, crc32(raw), true)
  central.setUint32(20, packed.length, true)
  central.setUint32(24, raw.length, true)
  central.setUint16(28, nameBytes.length, true)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, 1, true)
  end.setUint16(10, 1, true)
  end.setUint32(12, 46 + nameBytes.length, true)
  end.setUint32(16, 30 + nameBytes.length + extra.length + packed.length, true)
  const parts = [new Uint8Array(local.buffer), nameBytes, extra, packed, new Uint8Array(central.buffer), nameBytes, new Uint8Array(end.buffer)]
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0
  for (const part of parts) { out.set(part, at); at += part.length }
  return out
}

const inflate = async (data: Uint8Array) => new Uint8Array(inflateRawSync(data))

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('zipStored and openZip', () => {
  it('round trips entries, including non-ASCII names and empty files', async () => {
    const zip = openZip(zipStored([entry('a.txt', 'hello'), entry('dir/é.xml', '<x>ü</x>'), entry('empty', '')]))
    expect(zip.has('a.txt')).toBe(true)
    expect(zip.has('missing')).toBe(false)
    expect(await zip.text('a.txt')).toBe('hello')
    expect(await zip.text('dir/é.xml')).toBe('<x>ü</x>')
    expect(await zip.text('empty')).toBe('')
    expect(await zip.read('missing')).toBeNull()
  })

  it('writes a CRC other tools can check', () => {
    const bytes = zipStored([entry('a.txt', '123456789')])
    // The CRC sits at byte 14 of the first local header.
    expect(new DataView(bytes.buffer).getUint32(14, true)).toBe(0xcbf43926)
  })
})

describe('openZip', () => {
  it('inflates deflated entries and skips the extra field of the local header', async () => {
    const zip = openZip(deflatedZip('sheet.xml', '<row>'.repeat(200)), { inflate })
    expect(await zip.text('sheet.xml')).toBe('<row>'.repeat(200))
  })

  it('refuses a file that is not a ZIP', () => {
    expect(() => openZip(encoder.encode('just some text, not a zip file at all'))).toThrow(ZipError)
    expect(() => openZip(new Uint8Array(5))).toThrow('not a valid Excel')
  })

  it('refuses an entry that claims to unpack to more than the limit', async () => {
    const zip = openZip(zipStored([entry('big', 'x'.repeat(100))]), { maxEntryBytes: 50 })
    await expect(zip.read('big')).rejects.toThrow('more data than can be imported')
  })

  it('refuses a password protected file', () => {
    const bytes = zipStored([entry('a', 'x')])
    // Flag bit 0 of the central header marks encryption.
    const directory = new DataView(bytes.buffer).getUint32(bytes.length - 22 + 16, true)
    new DataView(bytes.buffer).setUint16(directory + 8, 1, true)
    expect(() => openZip(bytes)).toThrow('password protected')
  })

  it('refuses compression methods it cannot read', async () => {
    const bytes = zipStored([entry('a', 'x')])
    const directory = new DataView(bytes.buffer).getUint32(bytes.length - 22 + 16, true)
    new DataView(bytes.buffer).setUint16(directory + 10, 14, true)
    await expect(openZip(bytes).read('a')).rejects.toThrow('compression')
  })

  it('refuses a file cut short', () => {
    const bytes = zipStored([entry('a.txt', 'hello world')])
    expect(() => openZip(bytes.subarray(0, bytes.length - 30))).toThrow(ZipError)
  })
})
