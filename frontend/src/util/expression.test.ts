import { FUNCTION_NAMES, FormulaError, MAX_TEXT_LENGTH, evaluateExpression, formatValue, parseExpression, referencesIn, type Value } from './expression'

const NOW = new Date('2026-11-01T15:30:00Z')

function run(source: string, fields: Record<string, Value> = {}): Value {
  return evaluateExpression(parseExpression(source), {
    now: NOW,
    resolve: name => {
      if (!(name in fields)) throw new FormulaError('#REF!', `There is no field named {${name}}`)
      return fields[name]
    },
  })
}

function errorOf(source: string, fields: Record<string, Value> = {}): FormulaError {
  try {
    run(source, fields)
  } catch (error) {
    if (error instanceof FormulaError) return error
    throw error
  }
  throw new Error(`${source} did not fail`)
}

test('arithmetic follows the usual precedence', () => {
  expect(run('1 + 2 * 3')).toBe(7)
  expect(run('(1 + 2) * 3')).toBe(9)
  expect(run('10 - 4 - 3')).toBe(3)
  expect(run('2 * 3 ^ 2')).toBe(18)
  expect(run('7 / 2')).toBe(3.5)
  expect(run('1.5e2 + .5')).toBe(150.5)
})

test('unary minus binds tighter than ^ as in spreadsheets, and ^ runs left to right', () => {
  expect(run('-2 ^ 2')).toBe(4)
  expect(run('2 ^ 3 ^ 2')).toBe(64)
  expect(run('--3')).toBe(3)
  expect(run('3 - -2')).toBe(5)
  expect(run('+4')).toBe(4)
})

test('floating point noise is rounded away', () => {
  expect(run('0.1 + 0.2')).toBe(0.3)
  expect(run('0.1 + 0.2 = 0.3')).toBe(true)
  expect(run('1.1 * 3')).toBe(3.3)
})

test('references read field values by name, spaces included', () => {
  expect(run('{Unit price} * {Qty}', { 'Unit price': 2.5, Qty: 4 })).toBe(10)
  expect(run('{ Qty } + 1', { Qty: 4 })).toBe(5)
})

test('blank values count as zero, empty text or false', () => {
  expect(run('{A} + 5', { A: null })).toBe(5)
  expect(run('"x" & {A}', { A: null })).toBe('x')
  expect(run('{A} = 0', { A: null })).toBe(true)
  expect(run('{A} = ""', { A: null })).toBe(true)
  expect(run('{A} = FALSE', { A: null })).toBe(true)
  expect(run('{A} = {B}', { A: null, B: null })).toBe(true)
  expect(run('{A} < 1', { A: null })).toBe(true)
})

test('numbers, booleans and numeric text convert to numbers', () => {
  expect(run('TRUE + TRUE')).toBe(2)
  expect(run('"3" * 2')).toBe(6)
  expect(run('" 4.5 " + 1')).toBe(5.5)
  expect(errorOf('"abc" + 1').code).toBe('#VALUE!')
  expect(errorOf('"" + 1').code).toBe('#VALUE!')
})

test('text: joining, quotes and case-insensitive comparison', () => {
  expect(run('"a" & "b" & 1')).toBe('ab1')
  expect(run('"say ""hi"""')).toBe('say "hi"')
  expect(run('"Ada" = "ada"')).toBe(true)
  expect(run('"a" < "B"')).toBe(true)
  expect(run('TRUE & "!"')).toBe('TRUE!')
})

test('comparisons, including mixed types', () => {
  expect(run('2 >= 2')).toBe(true)
  expect(run('2 <> 3')).toBe(true)
  expect(run('2 != 3')).toBe(true)
  expect(run('1 < 2 = TRUE')).toBe(true)
  expect(run('"1" = 1')).toBe(false)
  expect(run('1 < "a"')).toBe(true)
  expect(run('"a" < TRUE')).toBe(true)
})

test('IF only evaluates the branch it needs', () => {
  expect(run('IF({D} = 0, 0, 10 / {D})', { D: 0 })).toBe(0)
  expect(run('IF({D} = 0, 0, 10 / {D})', { D: 4 })).toBe(2.5)
  expect(run('IF(FALSE, 1)')).toBe(false)
  expect(run('IF({Done}, "yes", "no")', { Done: true })).toBe('yes')
})

test('IFERROR falls back when the first value fails', () => {
  expect(run('IFERROR(1 / 0, "none")')).toBe('none')
  expect(run('IFERROR({Missing}, 7)')).toBe(7)
  expect(run('IFERROR(5, 7)')).toBe(5)
})

test('logic functions', () => {
  expect(run('AND(TRUE, 1, "true")')).toBe(true)
  expect(run('AND(TRUE, 0)')).toBe(false)
  expect(run('OR(FALSE, 0, 2)')).toBe(true)
  expect(run('NOT(FALSE)')).toBe(true)
  expect(run('ISBLANK({A})', { A: null })).toBe(true)
  expect(run('ISBLANK({A})', { A: '' })).toBe(true)
  expect(run('ISBLANK({A})', { A: 0 })).toBe(false)
  expect(errorOf('AND("maybe")').code).toBe('#VALUE!')
})

test('math functions', () => {
  expect(run('ABS(-3.5)')).toBe(3.5)
  expect(run('ROUND(2.5)')).toBe(3)
  expect(run('ROUND(-2.5)')).toBe(-3)
  expect(run('ROUND(1.005, 2)')).toBe(1.01)
  expect(run('ROUND(1234.567, -2)')).toBe(1200)
  expect(run('FLOOR(2.9)')).toBe(2)
  expect(run('CEILING(2.1)')).toBe(3)
  expect(run('MOD(10, 3)')).toBe(1)
  expect(run('MOD(-1, 3)')).toBe(2)
  expect(run('SQRT(16)')).toBe(4)
  expect(errorOf('SQRT(-1)').code).toBe('#NUM!')
  expect(errorOf('MOD(1, 0)').code).toBe('#DIV/0!')
})

test('aggregates skip blanks', () => {
  const fields = { A: 1, B: null, C: 5 }
  expect(run('SUM({A}, {B}, {C}, 4)', fields)).toBe(10)
  expect(run('AVERAGE({A}, {B}, {C})', fields)).toBe(3)
  expect(run('MIN({A}, {B}, {C})', fields)).toBe(1)
  expect(run('MAX({A}, {B}, {C})', fields)).toBe(5)
  expect(run('MAX({B})', fields)).toBe(0)
  expect(errorOf('AVERAGE({B})', fields).code).toBe('#DIV/0!')
  expect(errorOf('SUM("x")').code).toBe('#VALUE!')
})

test('text functions', () => {
  expect(run('CONCAT("a", 1, TRUE, {B})', { B: null })).toBe('a1TRUE')
  expect(run('LEN("héllo")')).toBe(5)
  expect(run('UPPER("ada")')).toBe('ADA')
  expect(run('LOWER("ADA")')).toBe('ada')
  expect(run('TRIM("  a   b ")')).toBe('a b')
  expect(run('LEFT("Lovelace", 4)')).toBe('Love')
  expect(run('LEFT("Lovelace")')).toBe('L')
  expect(run('RIGHT("Lovelace", 4)')).toBe('lace')
  expect(run('RIGHT("ab", 9)')).toBe('ab')
  expect(errorOf('LEFT("a", -1)').code).toBe('#VALUE!')
})

test('date functions work in UTC on YYYY-MM-DD text', () => {
  expect(run('TODAY()')).toBe('2026-11-01')
  expect(run('DAYS("2026-11-10", "2026-11-01")')).toBe(9)
  expect(run('DAYS("2027-01-01", "2026-12-25")')).toBe(7)
  expect(run('DAYS({Due}, TODAY())', { Due: '2026-10-30' })).toBe(-2)
  expect(run('DATEADD("2026-11-28", 5)')).toBe('2026-12-03')
  expect(run('DATEADD("2026-03-01", -1)')).toBe('2026-02-28')
  expect(run('YEAR("2026-11-01")')).toBe(2026)
  expect(run('MONTH("2026-11-01")')).toBe(11)
  expect(run('DAY("2026-11-01T10:00:00Z")')).toBe(1)
  expect(errorOf('DAYS("2026-02-30", "2026-01-01")').code).toBe('#VALUE!')
  expect(errorOf('YEAR("soon")').code).toBe('#VALUE!')
})

test('function names are not case sensitive', () => {
  expect(run('sum(1, 2)')).toBe(3)
  expect(run('true')).toBe(true)
  expect(FUNCTION_NAMES).toContain('SUM')
  expect(FUNCTION_NAMES).toContain('IF')
})

test('evaluation errors carry a spreadsheet-style code', () => {
  expect(errorOf('1 / 0').code).toBe('#DIV/0!')
  expect(errorOf('{Nope}').code).toBe('#REF!')
  expect(errorOf('10 ^ 1000').code).toBe('#NUM!')
})

test('parse errors say what is wrong', () => {
  const message = (source: string) => {
    try {
      parseExpression(source)
    } catch (error) {
      if (error instanceof FormulaError) return `${error.code} ${error.message}`
      throw error
    }
    throw new Error(`${source} parsed`)
  }
  expect(message('')).toBe('#ERROR! The formula is empty')
  expect(message('   ')).toBe('#ERROR! The formula is empty')
  expect(message('1 +')).toContain('The formula ends too early')
  expect(message('(1 + 2')).toContain('The formula ends too early')
  expect(message('1 2')).toContain('Unexpected "2"')
  expect(message('1 + )')).toContain('Unexpected ")"')
  expect(message('"abc')).toContain('closing quote')
  expect(message('{Price')).toContain('closing }')
  expect(message('{ }')).toContain('empty')
  expect(message('1 # 2')).toContain('Unexpected "#"')
  expect(message('FOO(1)')).toBe('#NAME? There is no function called FOO')
  expect(message('Price * 2')).toContain('Write field names in braces, like {Price}')
  expect(message('IF(1)')).toContain('IF needs 2 to 3 values, not 1')
  expect(message('TODAY(1)')).toContain('TODAY needs 0 values, not 1')
  expect(message('NOT()')).toContain('NOT needs 1 value, not 0')
  expect(message('SUM()')).toContain('SUM needs at least 1 value, not 0')
  expect(message('ROUND(1,2,3)')).toContain('ROUND needs 1 to 2 values, not 3')
  expect(message('constructor(1)')).toContain('There is no function called constructor')
})

test('referencesIn lists each field once, in order', () => {
  expect(referencesIn(parseExpression('{B} + SUM({A}, {B}) * -{C}'))).toEqual(['B', 'A', 'C'])
  expect(referencesIn(parseExpression('1 + 2'))).toEqual([])
})

test('formatValue shows blanks, booleans and numbers as cells do', () => {
  expect(formatValue(null)).toBe('')
  expect(formatValue(true)).toBe('TRUE')
  expect(formatValue(false)).toBe('FALSE')
  expect(formatValue(0.1 + 0.2)).toBe('0.3')
  expect(formatValue('x')).toBe('x')
})

test('text is limited to the size of a spreadsheet cell, counted in UTF-16 units', () => {
  const half = 'a'.repeat(16383)
  expect(MAX_TEXT_LENGTH).toBe(32767)
  expect(run('LEN({T} & {T} & "a")', { T: half })).toBe(32767)
  expect(errorOf('{T} & {T} & "ab"', { T: half }).code).toBe('#VALUE!')
  expect(errorOf('{T} & {T} & "ab"', { T: half }).message).toBe('The text is longer than 32767 characters')
  expect(errorOf('CONCAT({T}, {T}, "ab")', { T: half }).code).toBe('#VALUE!')
  // 16,384 characters, but 32,768 UTF-16 units.
  expect(errorOf('{T} & {T}', { T: '😀'.repeat(8192) }).code).toBe('#VALUE!')
  expect(run('LEN({T} & {T})', { T: '😀'.repeat(8191) })).toBe(32764)
})
