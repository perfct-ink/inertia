import { compileString } from 'sass'

// `@include dark` must follow the Appearance setting: dark when the OS is dark and no
// explicit theme is set, or when data-theme is "dark"; never when data-theme is "light".
const css = compileString("@use 'tokens' as *;\n.box { @include dark { color: red; } }", {
  loadPaths: [__dirname],
}).css

test('applies when the OS is dark and Appearance follows the system', () => {
  expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:where\(:root:not\(\[data-theme\]\)\) \.box/)
})

test('applies when Appearance is Dark, whatever the OS says', () => {
  expect(css).toMatch(/:where\(\[data-theme=dark\]\) \.box\s*\{\s*color: red/)
})

test('does not name the light setting, and adds no specificity beyond the class', () => {
  expect(css).not.toMatch(/data-theme=light/)
  // :where() has zero specificity, so every rule is as specific as `.box` alone.
  const selectors = css.match(/^\s*[^{}@]+(?=\{)/gm)!.map((selector) => selector.trim())
  expect(selectors.every((selector) => selector.startsWith(':where(') && selector.endsWith('.box'))).toBe(true)
})
