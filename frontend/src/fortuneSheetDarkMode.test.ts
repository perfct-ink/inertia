import { readFileSync } from 'fs'
import { join } from 'path'

// Regression guard: this selector has been guessed wrong twice before
// (targeting non-existent classes, then a class that only wraps the grid
// and misses the toolbar/footer). `.fortune-container` is the verified
// outermost wrapper Fortune Sheet renders — see the comment in SpreadsheetEditor.scss.
describe('Fortune Sheet dark mode CSS', () => {
  it('applies the invert filter to the real outermost wrapper class', () => {
    const css = readFileSync(join(__dirname, 'components/editors/SpreadsheetEditor.scss'), 'utf8')
    expect(css).toMatch(/\.fortune-container\s*\{\s*filter:\s*invert\(1\)\s*hue-rotate\(180deg\);?\s*\}/)
  })
})
