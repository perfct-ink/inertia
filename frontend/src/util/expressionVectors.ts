import type { FormulaField, RecordValues } from '@/data/formula'
import type { Value } from './expression'
import rawVectors from './expression.vectors.json'

// The shared test cases for the formula language (expression.vectors.json).
// The server runs the same file in backend/test/services/formula/vectors_test.rb.

export interface EvaluationCase {
  formula: string
  fields?: Record<string, Value>
  value?: Value
  error?: string
  message?: string
}

export interface RecordCase {
  name: string
  fields: FormulaField[]
  values: RecordValues
  results: Record<string, { value: Value } | { error: string; message: string }>
}

export interface Vectors {
  now: string
  functions: { name: string; min: number; max: number | null }[]
  evaluations: { group: string; cases: EvaluationCase[] }[]
  references: { formula: string; references: string[] }[]
  records: RecordCase[]
}

export const vectors = rawVectors as unknown as Vectors
