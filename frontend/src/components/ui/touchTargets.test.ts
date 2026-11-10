import { readFileSync } from 'fs'
import { join } from 'path'

// Design principle 1: a finger needs a 40px target. Jsdom has no layout, so these read the
// stylesheets for the coarse-pointer rules (desktop sizes are left alone).
const css = (name: string) => readFileSync(join(__dirname, name), 'utf8')
const coarse = (source: string, selector: string) => {
  const from = source.indexOf(selector)
  const media = source.indexOf('@media (pointer: coarse)', from)
  return source.slice(media, source.indexOf('}', media))
}

test('menu items are at least 44px tall on a touch screen, like select options', () => {
  expect(coarse(css('Menu.scss'), '&-item {')).toMatch(/min-height: space\(11\)/)
})

test('ghost buttons are at least 40px each way on a touch screen', () => {
  const rule = coarse(css('Button.scss'), '&--ghost')
  expect(rule).toMatch(/min-width: space\(10\)/)
  expect(rule).toMatch(/min-height: space\(10\)/)
})

test('the toast dismiss button is at least 40px each way on a touch screen', () => {
  const rule = coarse(css('Toast.scss'), '&-dismiss')
  expect(rule).toMatch(/min-width: space\(10\)/)
  expect(rule).toMatch(/min-height: space\(10\)/)
})
