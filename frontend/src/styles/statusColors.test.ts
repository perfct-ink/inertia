import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { TASK_STATUS_COLORS } from '@/data/task_status'
import { contrastRatio, mixColors, parseColor } from '@/util/cssColor'
import type { CssVars, Rgb } from '@/util/cssColor'

// Guards the status colors (docs/features/status_colors.md): every configurable
// status color has tokens in _theme.scss, the text tokens read at WCAG AA (4.5:1)
// in light and dark, and no stylesheet goes back to a fixed palette. The tokens
// are read from the stylesheets themselves, so a change to a mix percentage or
// to a Volta value that breaks contrast fails here.
const SRC = join(__dirname, '..')
const read = (path: string) => readFileSync(path, 'utf8')

const AA_TEXT = 4.5
const AA_GRAPHIC = 3

// A tint under text can be as strong as this before the text stops passing.
const DEFAULT_TINT = 15
const MAX_TINT: Record<string, number> = { red: 20, purple: 20 }

// Fills that do not reach 3:1 on a white page, kept as they were before the move
// to tokens; each is a dot, a bar with a text label, or an icon beside a name.
const LOW_CONTRAST_FILLS_LIGHT = ['yellow', 'orange']

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

// The text after `marker {` up to its closing brace, and the css without that block.
function takeBlocks(css: string, marker: string): { blocks: string[]; rest: string } {
  const blocks: string[] = []
  let rest = css
  for (let from = rest.indexOf(marker); from !== -1; from = rest.indexOf(marker)) {
    const open = rest.indexOf('{', from)
    let depth = 0
    let close = open
    for (; close < rest.length; close++) {
      if (rest[close] === '{') depth++
      if (rest[close] === '}' && --depth === 0) break
    }
    blocks.push(rest.slice(open + 1, close))
    rest = rest.slice(0, from) + rest.slice(close + 1)
  }
  return { blocks, rest }
}

function declarations(css: string): CssVars {
  const vars: CssVars = {}
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[name] = value.trim()
  return vars
}

const volta = takeBlocks(stripComments(read(join(__dirname, '_volta.scss'))), '@mixin dark-palette')
const theme = takeBlocks(stripComments(read(join(__dirname, '_theme.scss'))), '@include volta.dark-scheme')

const light: CssVars = { ...declarations(volta.rest), ...declarations(theme.rest) }
const dark: CssVars = { ...light, ...declarations(volta.blocks.join('\n')), ...declarations(theme.blocks.join('\n')) }
const THEMES: [string, CssVars][] = [['light', light], ['dark', dark]]

const color = (vars: CssVars, name: string): Rgb => parseColor(`var(${name})`, vars)

describe('status color tokens', () => {
  it.each(TASK_STATUS_COLORS)('%s has a fill, a text color in both themes, and a status dot', (hue) => {
    expect(light[`--status-${hue}`]).toBeDefined()
    for (const [, vars] of THEMES) expect(vars[`--status-${hue}-text`]).toBeDefined()
    expect(read(join(SRC, 'components/ui/StatusDot.scss'))).toContain(`color(status-${hue})`)
  })

  it('takes red and green from Volta and defines the rest in the theme', () => {
    expect(light['--status-red']).toBe('var(--v-color-danger)')
    expect(light['--status-green']).toBe('var(--v-color-success)')
    for (const hue of ['yellow', 'orange', 'blue', 'purple', 'gray']) expect(light[`--status-${hue}`]).toMatch(/^#[0-9a-f]{6}$/i)
  })

  describe.each(THEMES)('text on the %s theme', (_name, vars) => {
    it.each(TASK_STATUS_COLORS)('%s reads at 4.5:1 on the page, cards and its own tint', (hue) => {
      const text = color(vars, `--status-${hue}-text`)
      const fill = color(vars, `--status-${hue}`)
      const surfaces = ['--background', '--muted', '--card'].map((name) => color(vars, name))
      const tint = MAX_TINT[hue] ?? DEFAULT_TINT
      for (const surface of [...surfaces, mixColors(fill, tint, surfaces[0]), mixColors(fill, tint, surfaces[2])]) {
        expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(AA_TEXT)
      }
    })
  })

  describe.each(THEMES)('fills on the %s theme', (name, vars) => {
    it.each(TASK_STATUS_COLORS)('%s is told apart from the page at 3:1 unless it is a known exception', (hue) => {
      const ratio = contrastRatio(color(vars, `--status-${hue}`), color(vars, '--background'))
      const known = name === 'light' && LOW_CONTRAST_FILLS_LIGHT.includes(hue)
      expect(ratio >= AA_GRAPHIC).toBe(!known)
    })
  })
})

describe('stylesheets', () => {
  function stylesheets(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) return stylesheets(path)
      return path.endsWith('.scss') ? [path] : []
    })
  }

  it('use no fixed palette color but white and black (status colors are theme tokens)', () => {
    const offenders: string[] = []
    for (const path of stylesheets(SRC)) {
      for (const [, name] of read(path).matchAll(/palette\('([^']+)'/g)) {
        if (name !== 'white' && name !== 'black') offenders.push(`${path.slice(SRC.length + 1)}: palette('${name}')`)
      }
    }
    expect(offenders).toEqual([])
  })
})
