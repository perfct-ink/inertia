import { FUNCTION_ARITY, FormulaError, evaluateExpression, parseExpression, referencesIn, type Value } from './expression'
import { vectors, type EvaluationCase } from './expressionVectors'

// Every case in expression.vectors.json must come out the same here as on the
// server (backend/test/services/formula/vectors_test.rb).
const NOW = new Date(vectors.now)

// -0 reads as 0 in a cell and in JSON.
const plain = (value: Value): Value => (Object.is(value, -0) ? 0 : value)

function run({ formula, fields = {} }: EvaluationCase): { value: Value } | { error: string; message: string } {
  try {
    const value = evaluateExpression(parseExpression(formula), {
      now: NOW,
      resolve: name => {
        if (!(name in fields)) throw new FormulaError('#REF!', `There is no field named {${name}}`)
        return fields[name]
      },
    })
    return { value: plain(value) }
  } catch (error) {
    if (error instanceof FormulaError) return { error: error.code, message: error.message }
    throw error
  }
}

describe('shared formula test cases', () => {
  vectors.evaluations.forEach(({ group, cases }) => {
    test(group, () => {
      cases.forEach(item => {
        const expected = item.error === undefined ? { value: item.value } : { error: item.error, message: item.message }
        expect({ formula: item.formula, ...run(item) }).toEqual({ formula: item.formula, ...expected })
      })
    })
  })

  test('the references each formula names', () => {
    vectors.references.forEach(item => {
      expect({ formula: item.formula, references: referencesIn(parseExpression(item.formula)) }).toEqual(item)
    })
  })

  test('the function table has the names and argument counts the server has', () => {
    const table = FUNCTION_ARITY.map(({ name, min, max }) => ({ name, min, max: Number.isFinite(max) ? max : null }))
    expect(table).toEqual(vectors.functions)
  })
})
