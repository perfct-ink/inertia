// Just enough CSS color parsing to check contrast on the theme tokens in
// styles/_theme.scss (see styles/statusColors.test.ts): hex, hsl(), var() and
// color-mix(in srgb, A p%, B). Not used by the app.
export type Rgb = [number, number, number]

// Custom properties by name (`--v-color-base`), as written in the stylesheet.
export type CssVars = Record<string, string>

const MAX_DEPTH = 20

// Splits on a character that is not inside parentheses.
function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(text.slice(start).trim())
  return parts
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
  }
  return [channel(0), channel(8), channel(4)]
}

function parseHex(hex: string): Rgb {
  const digits = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  if (!/^[0-9a-f]{6}$/i.test(digits)) throw new Error(`Unsupported color: #${hex}`)
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as Rgb
}

// The color a CSS value stands for, following var() through `vars`.
export function parseColor(value: string, vars: CssVars = {}, depth = 0): Rgb {
  if (depth > MAX_DEPTH) throw new Error(`Colors refer to each other: ${value}`)
  const text = value.trim()

  if (text.startsWith('#')) return parseHex(text.slice(1))

  const variable = /^var\(\s*(--[\w-]+)\s*\)$/.exec(text)
  if (variable) {
    const target = vars[variable[1]]
    if (target === undefined) throw new Error(`Unknown custom property ${variable[1]}`)
    return parseColor(target, vars, depth + 1)
  }

  const hsl = /^hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*\)$/.exec(text)
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))

  const mix = /^color-mix\((.*)\)$/.exec(text)
  if (mix) {
    const [space, first, second] = splitTopLevel(mix[1], ',')
    const weighted = /^(.*\S)\s+([\d.]+)%$/.exec(first ?? '')
    if (space !== 'in srgb' || !weighted || !second) throw new Error(`Unsupported color-mix: ${text}`)
    return mixColors(parseColor(weighted[1], vars, depth + 1), Number(weighted[2]), parseColor(second, vars, depth + 1))
  }

  throw new Error(`Unsupported color: ${text}`)
}

// color-mix(in srgb, a percent%, b) for opaque colors.
export function mixColors(a: Rgb, percent: number, b: Rgb): Rgb {
  const weight = percent / 100
  return a.map((channel, i) => channel * weight + b[i] * (1 - weight)) as Rgb
}

// WCAG 2.1 relative luminance.
function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

// WCAG 2.1 contrast ratio, 1 to 21. Text needs 4.5 (AA); graphics 3.
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}
