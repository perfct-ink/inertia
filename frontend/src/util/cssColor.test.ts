import { contrastRatio, hueDegrees, mixColors, parseColor } from './cssColor'

const round = (rgb: number[]) => rgb.map((channel) => Math.round(channel))

describe('parseColor', () => {
  it('reads hex in three and six digits', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255])
    expect(parseColor('#03a10e')).toEqual([3, 161, 14])
  })

  it('reads hsl with or without the deg unit', () => {
    expect(round(parseColor('hsl(0deg 72% 51%)'))).toEqual([220, 40, 40])
    expect(round(parseColor('hsl(120, 100%, 50%)'))).toEqual([0, 255, 0])
    expect(round(parseColor('hsl(0deg 0% 100%)'))).toEqual([255, 255, 255])
  })

  it('follows var() through the custom properties given', () => {
    const vars = { '--a': 'var(--b)', '--b': '#000' }
    expect(parseColor('var(--a)', vars)).toEqual([0, 0, 0])
  })

  it('mixes like color-mix in srgb', () => {
    const vars = { '--fill': '#ff0000', '--trim': '#000000' }
    expect(round(parseColor('color-mix(in srgb, var(--fill) 50%, var(--trim))', vars))).toEqual([128, 0, 0])
  })

  it('refuses what it cannot read, and circular references', () => {
    expect(() => parseColor('red')).toThrow('Unsupported color')
    expect(() => parseColor('var(--missing)')).toThrow('Unknown custom property')
    expect(() => parseColor('var(--a)', { '--a': 'var(--a)' })).toThrow('refer to each other')
    expect(() => parseColor('color-mix(in oklch, #fff 50%, #000)')).toThrow('Unsupported color-mix')
  })
})

describe('mixColors', () => {
  it('weights the first color by its percentage', () => {
    expect(mixColors([100, 100, 100], 100, [0, 0, 0])).toEqual([100, 100, 100])
    expect(mixColors([100, 200, 0], 25, [0, 0, 100])).toEqual([25, 50, 75])
  })
})

describe('contrastRatio', () => {
  it('is 21 for black on white, 1 for the same color, and the same either way round', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 5)
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5)
  })

  it('matches known WCAG figures', () => {
    // #767676 on white is the textbook lightest gray that still passes AA.
    expect(contrastRatio(parseColor('#767676'), parseColor('#fff'))).toBeCloseTo(4.54, 2)
    expect(contrastRatio(parseColor('#eab308'), parseColor('#fff'))).toBeCloseTo(1.92, 2)
  })
})

describe('hueDegrees', () => {
  it('puts the primaries and secondaries where the color wheel does', () => {
    expect(hueDegrees([255, 0, 0])).toBe(0)
    expect(hueDegrees([255, 255, 0])).toBe(60)
    expect(hueDegrees([0, 255, 0])).toBe(120)
    expect(hueDegrees([0, 255, 255])).toBe(180)
    expect(hueDegrees([0, 0, 255])).toBe(240)
    expect(hueDegrees([255, 0, 255])).toBe(300)
  })

  it('wraps a magenta-leaning red below 360, and gives grays 0', () => {
    expect(hueDegrees([255, 0, 128])).toBeCloseTo(330, 0)
    expect(hueDegrees([128, 128, 128])).toBe(0)
  })

  it('reads the status yellow and orange', () => {
    expect(hueDegrees(parseColor('#eab308'))).toBeCloseTo(45.4, 1)
    expect(hueDegrees(parseColor('#db5e06'))).toBeCloseTo(24.8, 1)
  })
})
