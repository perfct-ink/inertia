// A small spreadsheet-style expression language, used by the Collection
// formula field (see data/formula.ts). Parse once, then evaluate against any
// resolver of {Field name} references.
//
//   {Price} * {Quantity}      IF({Done}, "yes", "no")      ROUND({Total} / 3, 2)
//
// Operators follow Excel's precedence, tightest first: unary minus, ^ (left
// to right), * /, + -, & (join text), then the comparisons = <> < <= > >=.
// Text is in "double quotes" ("" inside means a quote). Dates are
// "YYYY-MM-DD" text, in UTC. A blank value counts as 0, "" or FALSE.

export type Value = number | string | boolean | null

// code is the short spreadsheet-style label shown in a cell (#DIV/0!); message
// says what is wrong in words.
export class FormulaError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FormulaError'
    this.code = code
  }
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '<=' | '>' | '>='

export type Node =
  | { type: 'number'; value: number }
  | { type: 'text'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'ref'; name: string }
  | { type: 'unary'; op: '-' | '+'; arg: Node }
  | { type: 'binary'; op: BinaryOperator; left: Node; right: Node }
  | { type: 'call'; name: string; args: Node[] }

export interface Context {
  // The value of the field called name; throws FormulaError('#REF!', ...) if it does not exist.
  resolve: (name: string) => Value
  now: Date
}

const MS_PER_DAY = 86400000

// The first and last day a date can be (0000-01-01 and 9999-12-31), as days since 1970-01-01.
const MIN_DAY = Date.parse('0000-01-01') / MS_PER_DAY
const MAX_DAY = Date.parse('9999-12-31') / MS_PER_DAY

// ---------------------------------------------------------------------------
// Values

// Floating point noise (0.1 + 0.2) is rounded away, as spreadsheets do.
export const cleanNumber = (n: number): number => Number(n.toPrecision(15))

function quoted(value: Value): string {
  return typeof value === 'string' ? `"${value}"` : formatValue(value)
}

// How a value reads as text, in cells and when joined with &.
export function formatValue(value: Value): string {
  if (value === null) return ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return typeof value === 'number' ? String(cleanNumber(value)) : value
}

// Text such as "1e999" reads as a number too large to use.
function finiteNumber(n: number, text: string): number {
  if (!Number.isFinite(n)) throw new FormulaError('#NUM!', `${quoted(text)} is too large to be a number`)
  return n
}

const NUMERIC_TEXT = /^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i

function toNumber(value: Value): number {
  if (value === null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (NUMERIC_TEXT.test(value)) return finiteNumber(Number(value), value)
  throw new FormulaError('#VALUE!', `${quoted(value)} is not a number`)
}

function toBoolean(value: Value): boolean {
  if (value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const upper = value.trim().toUpperCase()
  if (upper === 'TRUE' || upper === 'FALSE') return upper === 'TRUE'
  throw new FormulaError('#VALUE!', `${quoted(value)} is not TRUE or FALSE`)
}

const isBlank = (value: Value): boolean => value === null || value === ''

function checkedNumber(n: number): number {
  if (!Number.isFinite(n)) throw new FormulaError('#NUM!', 'The result is not a finite number')
  return cleanNumber(n)
}

// Numbers sort before text, text before booleans; text ignores case. A blank
// takes the type of what it is compared with.
const rank = (value: Exclude<Value, null>): number => (typeof value === 'number' ? 0 : typeof value === 'string' ? 1 : 2)
const blankLike = (value: Exclude<Value, null>): Exclude<Value, null> => (typeof value === 'number' ? 0 : typeof value === 'string' ? '' : false)

function compareValues(left: Value, right: Value): number {
  if (left === null && right === null) return 0
  const a = left ?? blankLike(right as Exclude<Value, null>)
  const b = right ?? blankLike(left as Exclude<Value, null>)
  if (rank(a) !== rank(b)) return rank(a) - rank(b)
  if (typeof a === 'number' && typeof b === 'number') return Math.sign(cleanNumber(a) - cleanNumber(b))
  if (typeof a === 'string' && typeof b === 'string') {
    const x = a.toLowerCase()
    const y = b.toLowerCase()
    return x < y ? -1 : x > y ? 1 : 0
  }
  return Number(a) - Number(b)
}

// Whole days since 1970-01-01 for a "YYYY-MM-DD" date (a longer date-time is cut to its date).
function toDays(value: Value): number {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (match) {
    // setUTCFullYear, unlike Date.UTC, keeps years 0 to 99 as they are written.
    const date = new Date(0)
    date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    if (date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3])) return Math.round(date.getTime() / MS_PER_DAY)
  }
  throw new FormulaError('#VALUE!', `${quoted(value)} is not a date (use YYYY-MM-DD)`)
}

const fromDays = (days: number): Date => new Date(days * MS_PER_DAY)

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return (Math.sign(value) * Math.round(Number((Math.abs(value) * factor).toPrecision(15)))) / factor
}

// ---------------------------------------------------------------------------
// Functions

interface FunctionSpec {
  min: number
  max: number
  run: (args: Value[], ctx: Context) => Value
}

// Blank values are skipped by the aggregates, anything else must be a number.
const numbersIn = (args: Value[]): number[] => args.filter(arg => arg !== null).map(toNumber)

// MIN or MAX of the numbers, or 0 when every value is blank.
const extreme = (args: Value[], pick: (...numbers: number[]) => number): number => {
  const numbers = numbersIn(args)
  return numbers.length ? pick(...numbers) : 0
}

const countArg = (value: Value, fallback: number): number => {
  const n = value === undefined ? fallback : Math.trunc(toNumber(value))
  if (n < 0) throw new FormulaError('#VALUE!', 'The count cannot be negative')
  return n
}

// IF and IFERROR only evaluate the branch they need, so they are handled in evaluateExpression.
const LAZY_FUNCTIONS = new Set(['IF', 'IFERROR'])

const FUNCTIONS = new Map<string, FunctionSpec>(Object.entries<FunctionSpec>({
  IF: { min: 2, max: 3, run: () => null },
  IFERROR: { min: 2, max: 2, run: () => null },
  AND: { min: 1, max: Infinity, run: args => args.every(toBoolean) },
  OR: { min: 1, max: Infinity, run: args => args.some(toBoolean) },
  NOT: { min: 1, max: 1, run: ([value]) => !toBoolean(value) },
  ISBLANK: { min: 1, max: 1, run: ([value]) => isBlank(value) },
  ABS: { min: 1, max: 1, run: ([value]) => Math.abs(toNumber(value)) },
  ROUND: { min: 1, max: 2, run: ([value, digits]) => checkedNumber(roundTo(toNumber(value), digits === undefined ? 0 : Math.trunc(toNumber(digits)))) },
  FLOOR: { min: 1, max: 1, run: ([value]) => Math.floor(toNumber(value)) },
  CEILING: { min: 1, max: 1, run: ([value]) => Math.ceil(toNumber(value)) },
  MOD: {
    min: 2, max: 2,
    run: ([value, divisor]) => {
      const by = toNumber(divisor)
      if (by === 0) throw new FormulaError('#DIV/0!', 'Cannot divide by zero')
      const n = toNumber(value)
      return checkedNumber(n - by * Math.floor(n / by))
    },
  },
  SQRT: {
    min: 1, max: 1,
    run: ([value]) => {
      const n = toNumber(value)
      if (n < 0) throw new FormulaError('#NUM!', 'Cannot take the square root of a negative number')
      return checkedNumber(Math.sqrt(n))
    },
  },
  SUM: { min: 1, max: Infinity, run: args => checkedNumber(numbersIn(args).reduce((sum, n) => sum + n, 0)) },
  AVERAGE: {
    min: 1, max: Infinity,
    run: args => {
      const numbers = numbersIn(args)
      if (numbers.length === 0) throw new FormulaError('#DIV/0!', 'There are no numbers to average')
      return checkedNumber(numbers.reduce((sum, n) => sum + n, 0) / numbers.length)
    },
  },
  MIN: { min: 1, max: Infinity, run: args => extreme(args, Math.min) },
  MAX: { min: 1, max: Infinity, run: args => extreme(args, Math.max) },
  CONCAT: { min: 1, max: Infinity, run: args => args.map(formatValue).join('') },
  LEN: { min: 1, max: 1, run: ([value]) => formatValue(value).length },
  UPPER: { min: 1, max: 1, run: ([value]) => formatValue(value).toUpperCase() },
  LOWER: { min: 1, max: 1, run: ([value]) => formatValue(value).toLowerCase() },
  TRIM: { min: 1, max: 1, run: ([value]) => formatValue(value).trim().replace(/\s+/g, ' ') },
  LEFT: { min: 1, max: 2, run: ([value, count]) => formatValue(value).slice(0, countArg(count, 1)) },
  RIGHT: {
    min: 1, max: 2,
    run: ([value, count]) => {
      const text = formatValue(value)
      return text.slice(Math.max(text.length - countArg(count, 1), 0))
    },
  },
  TODAY: { min: 0, max: 0, run: (_args, ctx) => fromDays(Math.floor(ctx.now.getTime() / MS_PER_DAY)).toISOString().slice(0, 10) },
  DAYS: { min: 2, max: 2, run: ([end, start]) => toDays(end) - toDays(start) },
  DATEADD: {
    min: 2, max: 2,
    run: ([date, days]) => {
      const day = toDays(date) + Math.trunc(toNumber(days))
      if (day < MIN_DAY || day > MAX_DAY) throw new FormulaError('#NUM!', 'The date is out of range')
      return fromDays(day).toISOString().slice(0, 10)
    },
  },
  YEAR: { min: 1, max: 1, run: ([date]) => fromDays(toDays(date)).getUTCFullYear() },
  MONTH: { min: 1, max: 1, run: ([date]) => fromDays(toDays(date)).getUTCMonth() + 1 },
  DAY: { min: 1, max: 1, run: ([date]) => fromDays(toDays(date)).getUTCDate() },
}))

export const FUNCTION_NAMES: string[] = [...FUNCTIONS.keys()]

// How many values each function takes (max is Infinity for any number), checked against the server's table by the shared test cases.
export const FUNCTION_ARITY: { name: string; min: number; max: number }[] = [...FUNCTIONS].map(([name, { min, max }]) => ({ name, min, max }))

// ---------------------------------------------------------------------------
// Parsing

interface Token {
  kind: 'number' | 'text' | 'ref' | 'name' | 'op' | 'end'
  text: string
  pos: number
}

const parseError = (message: string, pos: number): FormulaError => new FormulaError('#ERROR!', `${message} (at character ${pos + 1})`)

const COMPARISONS = ['<>', '<=', '>=', '!=']

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    const rest = source.slice(i)
    if (/\s/.test(ch)) {
      i += 1
    } else if (/[0-9.]/.test(ch)) {
      const match = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(rest)
      if (!match) throw parseError(`Unexpected "${ch}"`, i)
      if (!Number.isFinite(Number(match[0]))) throw new FormulaError('#NUM!', `The number ${match[0]} is too large (at character ${i + 1})`)
      tokens.push({ kind: 'number', text: match[0], pos: i })
      i += match[0].length
    } else if (ch === '"') {
      let text = ''
      let j = i + 1
      for (;;) {
        if (j >= source.length) throw parseError('Text is missing its closing quote', i)
        if (source[j] === '"') {
          if (source[j + 1] !== '"') break
          text += '"'
          j += 2
        } else {
          text += source[j]
          j += 1
        }
      }
      tokens.push({ kind: 'text', text, pos: i })
      i = j + 1
    } else if (ch === '{') {
      const end = source.indexOf('}', i)
      if (end < 0) throw parseError('A field name is missing its closing }', i)
      const name = source.slice(i + 1, end).trim()
      if (!name) throw parseError('A field name between { } is empty', i)
      tokens.push({ kind: 'ref', text: name, pos: i })
      i = end + 1
    } else if (/[A-Za-z_]/.test(ch)) {
      const word = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest)![0]
      tokens.push({ kind: 'name', text: word, pos: i })
      i += word.length
    } else if (COMPARISONS.includes(rest.slice(0, 2))) {
      tokens.push({ kind: 'op', text: rest.slice(0, 2) === '!=' ? '<>' : rest.slice(0, 2), pos: i })
      i += 2
    } else if ('+-*/^&=<>(),'.includes(ch)) {
      tokens.push({ kind: 'op', text: ch, pos: i })
      i += 1
    } else {
      throw parseError(`Unexpected "${ch}"`, i)
    }
  }
  tokens.push({ kind: 'end', text: '', pos: source.length })
  return tokens
}

export function parseExpression(source: string): Node {
  if (!source.trim()) throw new FormulaError('#ERROR!', 'The formula is empty')
  const tokens = tokenize(source)
  let at = 0
  const peek = (): Token => tokens[at]
  const isOp = (...ops: string[]): boolean => peek().kind === 'op' && ops.includes(peek().text)
  const unexpected = (token: Token): FormulaError =>
    token.kind === 'end' ? parseError('The formula ends too early', token.pos) : parseError(`Unexpected "${token.text}"`, token.pos)

  function binaryLevel(operators: string[], next: () => Node): Node {
    let left = next()
    while (isOp(...operators)) {
      const op = tokens[at++].text as BinaryOperator
      left = { type: 'binary', op, left, right: next() }
    }
    return left
  }

  const comparison = (): Node => binaryLevel(['=', '<>', '<', '<=', '>', '>='], concat)
  const concat = (): Node => binaryLevel(['&'], additive)
  const additive = (): Node => binaryLevel(['+', '-'], term)
  const term = (): Node => binaryLevel(['*', '/'], power)
  const power = (): Node => binaryLevel(['^'], unary)

  function unary(): Node {
    if (isOp('-', '+')) {
      const op = tokens[at++].text as '-' | '+'
      return { type: 'unary', op, arg: unary() }
    }
    return primary()
  }

  function args(): Node[] {
    const list: Node[] = []
    if (isOp(')')) return list
    for (;;) {
      list.push(comparison())
      if (!isOp(',')) return list
      at += 1
    }
  }

  function call(token: Token): Node {
    const name = token.text.toUpperCase()
    const spec = FUNCTIONS.get(name)
    if (!spec) throw new FormulaError('#NAME?', `There is no function called ${token.text}`)
    at += 2 // the name and its (
    const list = args()
    if (!isOp(')')) throw unexpected(peek())
    at += 1
    if (list.length < spec.min || list.length > spec.max) {
      const count = spec.min === spec.max ? `${spec.min}` : spec.max === Infinity ? `at least ${spec.min}` : `${spec.min} to ${spec.max}`
      const noun = (spec.max === Infinity ? spec.min : spec.max) === 1 ? 'value' : 'values'
      throw new FormulaError('#ERROR!', `${name} needs ${count} ${noun}, not ${list.length}`)
    }
    return { type: 'call', name, args: list }
  }

  function primary(): Node {
    const token = tokens[at]
    if (token.kind === 'number') {
      at += 1
      return { type: 'number', value: Number(token.text) }
    }
    if (token.kind === 'text') {
      at += 1
      return { type: 'text', value: token.text }
    }
    if (token.kind === 'ref') {
      at += 1
      return { type: 'ref', name: token.text }
    }
    if (token.kind === 'name') {
      const upper = token.text.toUpperCase()
      if (tokens[at + 1].kind === 'op' && tokens[at + 1].text === '(') return call(token)
      at += 1
      if (upper === 'TRUE' || upper === 'FALSE') return { type: 'boolean', value: upper === 'TRUE' }
      throw new FormulaError('#NAME?', `"${token.text}" is not a function. Write field names in braces, like {${token.text}}`)
    }
    if (isOp('(')) {
      at += 1
      const inner = comparison()
      if (!isOp(')')) throw unexpected(peek())
      at += 1
      return inner
    }
    throw unexpected(token)
  }

  const root = comparison()
  if (peek().kind !== 'end') throw unexpected(peek())
  return root
}

// The distinct field names a parsed expression refers to, in order of appearance.
export function referencesIn(node: Node): string[] {
  const names: string[] = []
  const visit = (current: Node): void => {
    if (current.type === 'ref') {
      if (!names.includes(current.name)) names.push(current.name)
    } else if (current.type === 'unary') {
      visit(current.arg)
    } else if (current.type === 'binary') {
      visit(current.left)
      visit(current.right)
    } else if (current.type === 'call') {
      current.args.forEach(visit)
    }
  }
  visit(node)
  return names
}

// ---------------------------------------------------------------------------
// Evaluation

function applyBinary(op: BinaryOperator, left: Value, right: Value): Value {
  switch (op) {
    case '+': return checkedNumber(toNumber(left) + toNumber(right))
    case '-': return checkedNumber(toNumber(left) - toNumber(right))
    case '*': return checkedNumber(toNumber(left) * toNumber(right))
    case '/': {
      const divisor = toNumber(right)
      if (divisor === 0) throw new FormulaError('#DIV/0!', 'Cannot divide by zero')
      return checkedNumber(toNumber(left) / divisor)
    }
    case '^': return checkedNumber(toNumber(left) ** toNumber(right))
    case '&': return formatValue(left) + formatValue(right)
    case '=': return compareValues(left, right) === 0
    case '<>': return compareValues(left, right) !== 0
    case '<': return compareValues(left, right) < 0
    case '<=': return compareValues(left, right) <= 0
    case '>': return compareValues(left, right) > 0
    case '>=': return compareValues(left, right) >= 0
  }
}

export function evaluateExpression(node: Node, ctx: Context): Value {
  switch (node.type) {
    case 'number':
    case 'text':
    case 'boolean':
      return node.value
    case 'ref':
      return ctx.resolve(node.name)
    case 'unary': {
      const value = evaluateExpression(node.arg, ctx)
      return node.op === '-' ? 0 - toNumber(value) : value
    }
    case 'binary':
      return applyBinary(node.op, evaluateExpression(node.left, ctx), evaluateExpression(node.right, ctx))
    case 'call': {
      if (LAZY_FUNCTIONS.has(node.name)) return evaluateLazy(node, ctx)
      const values = node.args.map(arg => evaluateExpression(arg, ctx))
      return FUNCTIONS.get(node.name)!.run(values, ctx)
    }
  }
}

function evaluateLazy(node: Extract<Node, { type: 'call' }>, ctx: Context): Value {
  const [first, second, third] = node.args
  if (node.name === 'IFERROR') {
    try {
      return evaluateExpression(first, ctx)
    } catch (error) {
      if (error instanceof FormulaError) return evaluateExpression(second, ctx)
      throw error
    }
  }
  if (toBoolean(evaluateExpression(first, ctx))) return evaluateExpression(second, ctx)
  return third ? evaluateExpression(third, ctx) : false
}
