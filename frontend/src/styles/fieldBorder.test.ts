import { readFileSync } from 'fs'
import { join } from 'path'
import { contrastRatio, parseColor } from '@/util/cssColor'

// WCAG 1.4.11: the boundary of a control needs 3:1 against what it sits on. Volta's own
// border is 1.3:1, so fields use --field-border (docs/ui-components.md records the choice).
const theme = readFileSync(join(__dirname, '_theme.scss'), 'utf8')
const darkAt = theme.indexOf('dark-scheme {')
const value = (from: string, name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(from)![1]
const light = theme.slice(0, darkAt)
const dark = theme.slice(darkAt)

test('a field border reaches 3:1 on the page and on cards in light and dark', () => {
  const lightBorder = parseColor(value(light, '--field-border'))
  expect(contrastRatio(lightBorder, parseColor(value(light, '--v-color-base')))).toBeGreaterThanOrEqual(3)
  const darkBorder = parseColor(value(dark, '--field-border'))
  expect(contrastRatio(darkBorder, parseColor(value(dark, '--v-color-base')))).toBeGreaterThanOrEqual(3)
  expect(contrastRatio(darkBorder, parseColor(value(dark, '--card')))).toBeGreaterThanOrEqual(3)
})

test('inputs, text areas and selects draw their border with it', () => {
  const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8')
  expect(read('styles/_tokens.scss')).toMatch(/@mixin field-states \{\s*border-color: color\(field-border\)/)
  expect(read('components/ui/Select.scss')).toMatch(/border-color: color\(field-border\)/)
})
