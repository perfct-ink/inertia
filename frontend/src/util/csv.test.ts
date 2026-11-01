import { CsvError, csvFileName, detectDelimiter, neutralizeFormula, parseCsv, toCsv } from './csv'

describe('parseCsv', () => {
  it('reads plain rows with CRLF, LF and CR line ends', () => {
    expect(parseCsv('a,b\r\n1,2\n3,4\r5,6')).toEqual([['a', 'b'], ['1', '2'], ['3', '4'], ['5', '6']])
  })

  it('reads quoted cells with delimiters, doubled quotes and line breaks', () => {
    expect(parseCsv('name,note\n"Smith, Ada","said ""hi"""\n"two\nlines",x')).toEqual([
      ['name', 'note'],
      ['Smith, Ada', 'said "hi"'],
      ['two\nlines', 'x'],
    ])
  })

  it('drops a byte-order mark and blank lines, keeps empty cells', () => {
    expect(parseCsv('\uFEFFa,b,c\n\n1,,3\n\n')).toEqual([['a', 'b', 'c'], ['1', '', '3']])
  })

  it('keeps a quoted empty cell as a row', () => {
    expect(parseCsv('a\n""\nb')).toEqual([['a'], [''], ['b']])
  })

  it('treats a quote in the middle of a cell as text', () => {
    expect(parseCsv('5" pipe,x')).toEqual([['5" pipe', 'x']])
  })

  it('reports an unclosed quote with the line it started on', () => {
    let error: unknown
    try { parseCsv('a,b\n"oops,1\n2,3') } catch (e) { error = e }
    expect(error instanceof CsvError).toBe(true)
    expect((error as CsvError).message).toContain('line 2')
  })

  it('returns no rows for empty text', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('\n\n')).toEqual([])
  })

  it('uses a detected or given delimiter', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a|b', ',')).toEqual([['a|b']])
  })
})

describe('detectDelimiter', () => {
  it('picks the most common delimiter in the first record', () => {
    expect(detectDelimiter('a,b,c\n1;2;3;4')).toBe(',')
    expect(detectDelimiter('a;b;c\n1,2,3,4')).toBe(';')
    expect(detectDelimiter('a\tb\n1,2,3')).toBe('\t')
  })

  it('ignores delimiters inside quotes and defaults to a comma', () => {
    expect(detectDelimiter('"a;b;c",d\n1,2')).toBe(',')
    expect(detectDelimiter('single')).toBe(',')
  })
})

describe('toCsv', () => {
  it('quotes only the cells that need it', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'two\nlines', 'plain']])).toBe('a,"b,c","say ""hi""","two\nlines",plain')
  })

  it('writes numbers and booleans, and empty cells for null and undefined', () => {
    expect(toCsv([[1, 2.5, true, false, null, undefined]])).toBe('1,2.5,true,false,,')
  })

  it('joins rows with CRLF and round trips through parseCsv', () => {
    const rows = [['id', 'name'], ['1', 'Smith, "Ada"'], ['2', 'line\nbreak'], ['3', '']]
    const text = toCsv(rows)
    expect(text.split('\r\n')[0]).toBe('id,name')
    expect(parseCsv(text)).toEqual(rows)
  })

  it('uses the given delimiter', () => {
    expect(toCsv([['a;b', 'c,d']], ';')).toBe('"a;b";c,d')
  })
})

describe('neutralizeFormula', () => {
  it('prefixes text a spreadsheet would run as a formula', () => {
    expect(neutralizeFormula('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(neutralizeFormula('+1')).toBe("'+1")
    expect(neutralizeFormula('-2')).toBe("'-2")
    expect(neutralizeFormula('@user')).toBe("'@user")
    expect(neutralizeFormula('\tindented')).toBe("'\tindented")
  })

  it('leaves ordinary text alone', () => {
    expect(neutralizeFormula('Hello = world')).toBe('Hello = world')
    expect(neutralizeFormula('2026-11-01')).toBe('2026-11-01')
    expect(neutralizeFormula('')).toBe('')
  })
})

describe('csvFileName', () => {
  it('makes a safe file name from a title', () => {
    expect(csvFileName('Q3 plan / draft')).toBe('Q3_plan_draft.csv')
    expect(csvFileName('  ..hidden: file?  ')).toBe('hidden_file.csv')
  })

  it('falls back when nothing is left', () => {
    expect(csvFileName('')).toBe('export.csv')
    expect(csvFileName('///', 'tasks')).toBe('tasks.csv')
  })
})
