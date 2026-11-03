import { vectors } from '@/util/expressionVectors'
import { computeFormulas } from './formula'

// The saved results on the server come from the same cases
// (backend/test/services/formula/vectors_test.rb).
describe('shared formula test cases for a record', () => {
  vectors.records.forEach(scenario => {
    test(scenario.name, () => {
      const results = computeFormulas(scenario.fields, scenario.values, new Date(vectors.now))
      // Through JSON, as the API sends it (-0 reads as 0).
      const plain = JSON.parse(JSON.stringify(Object.fromEntries([...results].map(([id, result]) => [String(id), result]))))
      expect(plain).toEqual(scenario.results)
    })
  })
})
