import type { KeyResult } from '@/types'
import { formatScore, keyResultMeasure } from './okr'

const kr = (opts: Partial<KeyResult>) => ({ initiative_id: null, start_value: 0, target_value: 1000, current_value: 250, unit: 'users', ...opts }) as KeyResult

test('number key results read as current / target unit; linked ones have no number', () => {
  expect(keyResultMeasure(kr({}))).toBe(`250 / ${(1000).toLocaleString()} users`)
  expect(keyResultMeasure(kr({ unit: null, current_value: 6.5, target_value: 5 }))).toBe('6.5 / 5')
  expect(keyResultMeasure(kr({ initiative_id: 3 }))).toBeNull()
})

test('scores show two decimals', () => {
  expect(formatScore(0.7)).toBe('0.70')
})
