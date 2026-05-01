import { computeVariance, formatVariancePct, formatValue, COLOR_CLASSES, COLOR_DOT, getVarianceColor } from '@/lib/kpi'

describe('computeVariance', () => {
  it('returns pct as (actual/target)*100', () => {
    const result = computeVariance(95, 100)
    expect(result.pct).toBeCloseTo(95)
  })

  it('classifies >95% as green', () => {
    expect(computeVariance(96, 100).color).toBe('green')
  })

  it('classifies exactly 95% as amber', () => {
    expect(computeVariance(95, 100).color).toBe('amber')
  })

  it('classifies 96% as green', () => {
    expect(computeVariance(96, 100).color).toBe('green')
  })

  it('classifies 90% as amber', () => {
    expect(computeVariance(90, 100).color).toBe('amber')
  })

  it('classifies exactly 85% as amber', () => {
    expect(computeVariance(85, 100).color).toBe('amber')
  })

  it('classifies 84% as red', () => {
    expect(computeVariance(84, 100).color).toBe('red')
  })

  it('handles zero target without throwing', () => {
    const result = computeVariance(10, 0)
    expect(result.color).toBe('red')
    expect(result.pct).toBe(0)
  })
})

describe('COLOR_CLASSES', () => {
  it('has entries for green, amber, red', () => {
    expect(COLOR_CLASSES.green).toBeDefined()
    expect(COLOR_CLASSES.amber).toBeDefined()
    expect(COLOR_CLASSES.red).toBeDefined()
  })
})

describe('formatVariancePct', () => {
  it('formats with one decimal and Arabic percent sign', () => {
    expect(formatVariancePct(90.123)).toBe('90.1٪')
  })
})

describe('COLOR_DOT', () => {
  it('has entries for green, amber, red', () => {
    expect(COLOR_DOT.green).toBeDefined()
    expect(COLOR_DOT.amber).toBeDefined()
    expect(COLOR_DOT.red).toBeDefined()
  })
})

describe('formatValue', () => {
  it('formats COUNT values as Arabic locale numbers', () => {
    const result = formatValue(1000, 'COUNT')
    expect(result).toContain('1')
    expect(result).toContain('000')
  })

  it('formats PERCENT values with Arabic percent sign', () => {
    expect(formatValue(95, 'PERCENT')).toContain('٪')
  })

  it('formats CURRENCY values with dirham suffix', () => {
    expect(formatValue(5000, 'CURRENCY')).toContain('د.إ')
  })
})

describe('getVarianceColor', () => {
  it('returns green for >95', () => expect(getVarianceColor(96)).toBe('green'))
  it('returns amber for 85-95', () => expect(getVarianceColor(90)).toBe('amber'))
  it('returns red for <85', () => expect(getVarianceColor(80)).toBe('red'))
})
