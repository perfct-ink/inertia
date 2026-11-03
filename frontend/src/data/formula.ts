import { FUNCTION_NAMES, FormulaError, evaluateExpression, formatValue, parseExpression, referencesIn, type Node, type Value } from '@/util/expression'

// Mirrors TableField on the server: the type name and the longest formula it stores.
export const FORMULA_TYPE = 'formula'
export const MAX_FORMULA_LENGTH = 1000

// A formula field only needs these parts of a collection field.
export interface FormulaField {
  id: number
  name: string
  data_type: string
  formula?: string | null
}

// A record's values by field id, as the API sends them. A File field holds a
// list of file ids, which formulas can't use, so it counts as blank.
export type RecordValues = Record<string, Value | number[] | undefined>

export type FormulaResult = { value: Value } | { error: string; message: string }

export const isFormulaField = (field: Pick<FormulaField, 'data_type'>): boolean => field.data_type === FORMULA_TYPE

// What the formula field's form tells people about writing a formula.
export const FORMULA_HELP = `Refer to a field as {Field name}. Operators: + - * / ^ & = <> < <= > >=. Functions: ${FUNCTION_NAMES.join(', ')}.`

// Records are shown row by row, so each formula is parsed once and reused.
const parsed = new Map<string, Node>()
const MAX_PARSED = 500

function parse(source: string): Node {
  let node = parsed.get(source)
  if (!node) {
    node = parseExpression(source)
    if (parsed.size >= MAX_PARSED) parsed.clear()
    parsed.set(source, node)
  }
  return node
}

// The value of every formula field of one record. Formulas read the record's
// other fields by name (including other formulas) and are worked out here,
// never stored. A problem shows as an error for that cell only.
export function computeFormulas(fields: FormulaField[], values: RecordValues, now: Date = new Date()): Map<number, FormulaResult> {
  const byName = new Map(fields.map(field => [field.name, field] as const))
  const results = new Map<number, FormulaResult>()
  const running = new Set<number>()

  function valueOf(field: FormulaField): Value {
    if (!isFormulaField(field)) {
      const value = values[String(field.id)]
      return Array.isArray(value) ? null : value ?? null
    }
    const result = compute(field)
    if ('error' in result) throw new FormulaError(result.error, result.message)
    return result.value
  }

  function compute(field: FormulaField): FormulaResult {
    const known = results.get(field.id)
    if (known) return known
    if (running.has(field.id)) return { error: '#CIRC!', message: `{${field.name}} depends on itself` }
    running.add(field.id)
    let result: FormulaResult
    try {
      const resolve = (name: string): Value => {
        const target = byName.get(name)
        if (!target) throw new FormulaError('#REF!', `There is no field named {${name}}`)
        return valueOf(target)
      }
      result = { value: evaluateExpression(parse(field.formula ?? ''), { resolve, now }) }
    } catch (error) {
      if (!(error instanceof FormulaError)) throw error
      result = { error: error.code, message: error.message }
    } finally {
      running.delete(field.id)
    }
    results.set(field.id, result)
    return result
  }

  fields.filter(isFormulaField).forEach(compute)
  return results
}

// How a result reads in a cell: the value, or the error label.
export function formatResult(result: FormulaResult): string {
  return 'error' in result ? result.error : formatValue(result.value)
}

// Whether the formula in `name` (a field being created or edited) can be
// saved next to the collection's other fields. Returns what is wrong, or null.
export function checkFormula(name: string, formula: string, others: FormulaField[]): string | null {
  if (formula.length > MAX_FORMULA_LENGTH) return `A formula can be up to ${MAX_FORMULA_LENGTH} characters`
  let references: string[]
  try {
    references = referencesIn(parse(formula))
  } catch (error) {
    if (error instanceof FormulaError) return error.message
    throw error
  }
  if (references.includes(name)) return 'A formula cannot refer to its own field'
  const byName = new Map(others.map(field => [field.name, field] as const))
  const unknown = references.find(reference => !byName.has(reference))
  if (unknown !== undefined) return `There is no field named {${unknown}}`
  const loop = findLoop(name, references, byName)
  return loop ? `That would make a loop: {${loop}} already uses this field` : null
}

// A formula field, reached from `references`, that leads back to `name`.
function findLoop(name: string, references: string[], byName: Map<string, FormulaField>): string | null {
  const seen = new Set<string>()
  const visit = (reference: string): string | null => {
    const field = byName.get(reference)
    if (!field || !isFormulaField(field) || seen.has(reference)) return null
    seen.add(reference)
    let next: string[]
    try {
      next = referencesIn(parse(field.formula ?? ''))
    } catch {
      return null
    }
    if (next.includes(name)) return reference
    for (const further of next) {
      const found = visit(further)
      if (found) return found
    }
    return null
  }
  for (const reference of references) {
    const found = visit(reference)
    if (found) return found
  }
  return null
}
