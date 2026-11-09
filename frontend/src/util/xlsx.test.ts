import { XlsxError, buildXlsx, columnIndex, columnName, isDateFormatCode, parseXlsx, serialToText, sheetTabName } from './xlsx'
import { openZip, zipStored, type ZipEntry } from './zip'

const encoder = new TextEncoder()
const xml = (name: string, body: string): ZipEntry => ({ name, data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${body}`) })

const MAIN = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
const REL = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

// A workbook shaped the way Excel writes it: shared strings, a styles part with
// date formats, and cells that name their own position.
function excelWorkbook(sheetRows: string, extra: { sharedStrings?: string; styles?: string; workbookPr?: string; sheetTarget?: string } = {}): Uint8Array {
  const entries: ZipEntry[] = [
    xml('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    xml('xl/workbook.xml', `<workbook ${MAIN} ${REL}>${extra.workbookPr ?? ''}<sheets><sheet name="Data" sheetId="1" r:id="rId7"/><sheet name="Other" sheetId="2" r:id="rId8"/></sheets></workbook>`),
    xml('xl/_rels/workbook.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId7" Type="x/worksheet" Target="${extra.sheetTarget ?? 'worksheets/sheet1.xml'}"/><Relationship Id="rId8" Type="x/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`),
    xml('xl/worksheets/sheet1.xml', `<worksheet ${MAIN}><sheetData>${sheetRows}</sheetData></worksheet>`),
    xml('xl/worksheets/sheet2.xml', `<worksheet ${MAIN}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Other sheet</t></is></c></row></sheetData></worksheet>`),
  ]
  if (extra.sharedStrings) entries.push(xml('xl/sharedStrings.xml', `<sst ${MAIN}>${extra.sharedStrings}</sst>`))
  if (extra.styles) entries.push(xml('xl/styles.xml', `<styleSheet ${MAIN}>${extra.styles}</styleSheet>`))
  return zipStored(entries)
}

// Style 0 plain, 1 date (built-in 14), 2 custom date and time, 3 custom time, 4 a number format with a colour name.
const STYLES = '<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd\\ hh:mm"/><numFmt numFmtId="165" formatCode="h:mm:ss"/><numFmt numFmtId="166" formatCode="[Magenta]0.00&quot; days&quot;"/></numFmts>'
  + '<cellStyleXfs count="1"><xf numFmtId="14"/></cellStyleXfs>'
  + '<cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="166"/></cellXfs>'

describe('columnName and columnIndex', () => {
  it('count like a spreadsheet', () => {
    expect([0, 1, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'ZZ', 'AAA'])
    expect(['A1', 'Z9', 'AA12', 'ZZ3', 'AAA1', 'c7'].map(columnIndex)).toEqual([0, 25, 26, 701, 702, 2])
  })
})

describe('sheetTabName', () => {
  it('keeps to what Excel accepts for a tab', () => {
    expect(sheetTabName('Q3: plan / draft?')).toBe('Q3 plan draft')
    expect(sheetTabName("'quoted'")).toBe('quoted')
    expect(sheetTabName('x'.repeat(40))).toHaveLength(31)
    expect(sheetTabName('   ')).toBe('Sheet1')
  })
})

describe('serialToText', () => {
  it('turns date serials into ISO dates', () => {
    expect(serialToText(1)).toBe('1900-01-01')
    expect(serialToText(59)).toBe('1900-02-28')
    expect(serialToText(61)).toBe('1900-03-01')
    expect(serialToText(25569)).toBe('1970-01-01')
    expect(serialToText(46327)).toBe('2026-11-01')
  })

  it('adds the time when there is one, and gives a time alone for a fraction', () => {
    expect(serialToText(46327.395833333336)).toBe('2026-11-01 09:30:00')
    expect(serialToText(46327.5)).toBe('2026-11-01 12:00:00')
    expect(serialToText(0.75)).toBe('18:00:00')
  })

  it('rounds to the second and carries into the next day', () => {
    expect(serialToText(46327.99999999)).toBe('2026-11-02')
  })

  it('counts from 1904 when the workbook says so', () => {
    expect(serialToText(0, true)).toBe('00:00:00')
    expect(serialToText(1462, true)).toBe('1908-01-02')
    expect(serialToText(46327 - 1462, true)).toBe('2026-11-01')
  })
})

describe('isDateFormatCode', () => {
  it('recognises date and time formats', () => {
    for (const code of ['yyyy-mm-dd', 'm/d/yy', 'd-mmm-yy', 'hh:mm:ss', 'h:mm AM/PM', '[h]:mm:ss', 'yyyy\\-mm\\-dd\\ hh:mm', '[$-409]mmmm d, yyyy']) {
      expect(isDateFormatCode(code)).toBe(true)
    }
  })

  it('leaves number formats alone, including quoted text and colour names', () => {
    for (const code of ['General', '0.00', '#,##0', '0%', '0.00E+00', '"days"0', '[Magenta]0.00', '[Red]#,##0;[Blue]-#,##0', '@']) {
      expect(isDateFormatCode(code)).toBe(false)
    }
  })
})

describe('buildXlsx', () => {
  it('writes the parts of a workbook', async () => {
    const zip = openZip(buildXlsx([['Name'], ['Ada']], 'People'))
    for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      expect(zip.has(part)).toBe(true)
    }
    expect(await zip.text('xl/workbook.xml')).toContain('<sheet name="People" sheetId="1" r:id="rId1"/>')
  })

  it('keeps text as text, so a formula is never run, and keeps numbers and booleans typed', async () => {
    const sheet = (await openZip(buildXlsx([['Header'], ['=SUM(A1:A2)'], [36], [true], [-2.5]])).text('xl/worksheets/sheet1.xml'))!
    expect(sheet).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">=SUM(A1:A2)</t></is></c>')
    expect(sheet).toContain('<c r="A3"><v>36</v></c>')
    expect(sheet).toContain('<c r="A4" t="b"><v>1</v></c>')
    expect(sheet).toContain('<c r="A5"><v>-2.5</v></c>')
    expect(sheet).not.toContain('<f>')
  })

  it('makes the first row a bold, frozen header and leaves empty values out', async () => {
    const sheet = (await openZip(buildXlsx([['A', 'B'], ['x', null], [undefined, '']])).text('xl/worksheets/sheet1.xml'))!
    expect(sheet).toContain('<c r="A1" s="1" t="inlineStr">')
    expect(sheet).toContain('state="frozen"')
    expect(sheet).toContain('<row r="2"><c r="A2" t="inlineStr"><is><t xml:space="preserve">x</t></is></c></row>')
    expect(sheet).toContain('<row r="3"></row>')
  })

  it('escapes XML and drops characters XML cannot hold', async () => {
    const sheet = (await openZip(buildXlsx([['H'], ['a & b < c > "d"\u0001\u000b']])).text('xl/worksheets/sheet1.xml'))!
    expect(sheet).toContain('a &amp; b &lt; c &gt; &quot;d&quot;</t>')
  })

  it('writes well-formed XML in every part', async () => {
    const zip = openZip(buildXlsx([['Name', 'Note'], ['Ada', 'line one\nline two'], ['Zoë', '<b>']], 'A/B'))
    for (const part of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
      const doc = new DOMParser().parseFromString((await zip.text(part))!, 'application/xml')
      expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
    }
  })
})

describe('parseXlsx', () => {
  it('reads back what buildXlsx wrote, as text', async () => {
    const rows = [
      ['Record ID', 'Name', 'Age', 'Active', 'Note'],
      [10, 'Zoë "Z" <z@example.com> & co', 36.5, true, 'two\nlines'],
      [11, '=SUM(A1)', -2, false, ''],
      [12, '', '', '', 'only a note'],
    ]
    expect(await parseXlsx(buildXlsx(rows))).toEqual([
      ['Record ID', 'Name', 'Age', 'Active', 'Note'],
      ['10', 'Zoë "Z" <z@example.com> & co', '36.5', 'true', 'two\nlines'],
      ['11', '=SUM(A1)', '-2', 'false'],
      ['12', '', '', '', 'only a note'],
    ])
  })

  it('reads shared strings, including rich text, and ignores phonetic hints', async () => {
    const bytes = excelWorkbook(
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>',
      { sharedStrings: '<si><t>Name</t></si><si><r><t>Rich </t></r><r><rPr><b/></rPr><t>text</t></r></si><si><t>東京</t><rPh sb="0" eb="2"><t>トウキョウ</t></rPh></si>' },
    )
    expect(await parseXlsx(bytes)).toEqual([['Name', 'Rich text', '東京']])
  })

  it('reads the sheet the first tab points at, by an absolute, relative or other path', async () => {
    const rows = '<row r="1"><c r="A1" t="inlineStr"><is><t>First</t></is></c></row>'
    expect(await parseXlsx(excelWorkbook(rows, { sheetTarget: '/xl/worksheets/sheet1.xml' }))).toEqual([['First']])
    expect(await parseXlsx(excelWorkbook(rows, { sheetTarget: '../xl/worksheets/sheet1.xml' }))).toEqual([['First']])
    expect(await parseXlsx(excelWorkbook(rows, { sheetTarget: 'worksheets/sheet2.xml' }))).toEqual([['Other sheet']])
  })

  it('places cells by their reference, so gaps and skipped rows keep their shape', async () => {
    const bytes = excelWorkbook(
      '<row r="2"><c r="B2" t="inlineStr"><is><t>b2</t></is></c><c r="D2" t="inlineStr"><is><t>d2</t></is></c></row>'
      + '<row r="3"><c r="A3"><v>1</v></c><c r="B3"/><c r="C3"><v></v></c></row>'
      + '<row r="5"><c r="A5" t="inlineStr"><is><t>a5</t></is></c></row>',
    )
    expect(await parseXlsx(bytes)).toEqual([['', 'b2', '', 'd2'], ['1'], ['a5']])
  })

  it('turns date and time cells into text a collection can read', async () => {
    const bytes = excelWorkbook(
      '<row r="1"><c r="A1" s="1"><v>46327</v></c><c r="B1" s="2"><v>46327.395833333336</v></c><c r="C1" s="3"><v>0.75</v></c><c r="D1"><v>46327</v></c><c r="E1" s="4"><v>1.5</v></c></row>',
      { styles: STYLES },
    )
    expect(await parseXlsx(bytes)).toEqual([['2026-11-01', '2026-11-01 09:30:00', '18:00:00', '46327', '1.5']])
  })

  it('counts dates from 1904 when the workbook says so', async () => {
    const bytes = excelWorkbook('<row r="1"><c r="A1" s="1"><v>44865</v></c></row>', { styles: STYLES, workbookPr: '<workbookPr date1904="1"/>' })
    expect(await parseXlsx(bytes)).toEqual([['2026-11-01']])
  })

  it('reads booleans, formula results, errors and numbers written with an exponent', async () => {
    const bytes = excelWorkbook(
      '<row r="1"><c r="A1" t="b"><v>1</v></c><c r="B1" t="b"><v>0</v></c><c r="C1" t="str"><f>A1&amp;"x"</f><v>truex</v></c><c r="D1" t="e"><v>#DIV/0!</v></c>'
      + '<c r="E1"><v>1.5E-3</v></c><c r="F1"><v>1E+21</v></c><c r="G1"><v>0.1</v></c></row>',
    )
    expect(await parseXlsx(bytes)).toEqual([['true', 'false', 'truex', '', '0.0015', '1000000000000000000000', '0.1']])
  })

  it('understands a namespace prefix on every element', async () => {
    const prefixed = `<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>Hi</x:t></x:is></x:c></x:row></x:sheetData></x:worksheet>`
    const bytes = zipStored([
      xml('xl/workbook.xml', `<x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ${REL}><x:sheets><x:sheet name="S" sheetId="1" r:id="rId1"/></x:sheets></x:workbook>`),
      xml('xl/_rels/workbook.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>'),
      { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(prefixed) },
    ])
    expect(await parseXlsx(bytes)).toEqual([['Hi']])
  })

  it('returns no rows for an empty sheet', async () => {
    expect(await parseXlsx(excelWorkbook(''))).toEqual([])
    expect(await parseXlsx(excelWorkbook('<row r="1"><c r="A1"/></row>'))).toEqual([])
  })

  it('explains a file that is not a workbook', async () => {
    await expect(parseXlsx(zipStored([xml('hello.txt', 'hi')]))).rejects.toThrow(XlsxError)
    await expect(parseXlsx(zipStored([xml('hello.txt', 'hi')]))).rejects.toThrow('not an Excel workbook')
    await expect(parseXlsx(encoder.encode('a,b,c\n1,2,3'))).rejects.toThrow('not a valid Excel')
  })

  it('explains a part that is damaged', async () => {
    const bytes = zipStored([xml('xl/workbook.xml', '<workbook><sheets><sheet'), xml('xl/worksheets/sheet1.xml', '<worksheet/>')])
    await expect(parseXlsx(bytes)).rejects.toThrow('damaged')
  })

  it('refuses a sheet with more rows or columns than it can hold', async () => {
    await expect(parseXlsx(excelWorkbook('<row r="50001"><c r="A50001"><v>1</v></c></row>'))).rejects.toThrow('more than 50000 rows')
    await expect(parseXlsx(excelWorkbook('<row r="1"><c r="ZZZ1"><v>1</v></c></row>'))).rejects.toThrow('more than 1000 columns')
  })
})
