import { computeVariance, formatVariancePct, formatValue, HEX_COLORS, getVarianceColor } from '@/lib/kpi'

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

describe('HEX_COLORS', () => {
  it('has entries for green, amber, red', () => {
    expect(HEX_COLORS.green).toBeDefined()
    expect(HEX_COLORS.amber).toBeDefined()
    expect(HEX_COLORS.red).toBeDefined()
  })
})

describe('formatVariancePct', () => {
  it('formats with one decimal and Latin percent sign', () => {
    expect(formatVariancePct(90.123)).toBe('90.1%')
  })
})

describe('formatValue', () => {
  it('formats COUNT values as English locale numbers', () => {
    const result = formatValue(1000, 'COUNT')
    expect(result).toBe('1,000')
  })

  it('formats PERCENT values with Latin percent sign', () => {
    expect(formatValue(95, 'PERCENT')).toBe('95.0%')
  })

  it('formats CURRENCY values with dirham suffix', () => {
    expect(formatValue(5000, 'CURRENCY')).toContain('د.إ')
    expect(formatValue(5000, 'CURRENCY')).toContain('5,000')
  })
})

describe('getVarianceColor', () => {
  it('returns green for >95', () => expect(getVarianceColor(96)).toBe('green'))
  it('returns amber for 85-95', () => expect(getVarianceColor(90)).toBe('amber'))
  it('returns red for <85', () => expect(getVarianceColor(80)).toBe('red'))
})

import { computeYtd } from '@/lib/kpi'

describe('computeYtd', () => {
  it('returns null when no quarters have values', () => {
    expect(computeYtd({}, 'CUMULATIVE')).toBeNull()
    expect(computeYtd({}, 'MONTHLY_VARIANCE')).toBeNull()
  })

  it('cumulative: sums all available quarters', () => {
    expect(computeYtd({ Q1: 100, Q2: 150, Q3: 60 }, 'CUMULATIVE')).toBe(310)
  })

  it('cumulative: returns single quarter value when only Q1 available', () => {
    expect(computeYtd({ Q1: 100 }, 'CUMULATIVE')).toBe(100)
  })

  it('monthly_variance: returns the last available quarter value', () => {
    expect(computeYtd({ Q1: 82, Q2: 84, Q3: 81 }, 'MONTHLY_VARIANCE')).toBe(81)
  })

  it('monthly_variance: returns Q1 when only Q1 available', () => {
    expect(computeYtd({ Q1: 250 }, 'MONTHLY_VARIANCE')).toBe(250)
  })

  it('monthly_variance: handles non-sequential quarters (uses last defined)', () => {
    // Q1 present, Q2 missing, Q3 present — last defined in order is Q3
    expect(computeYtd({ Q1: 100, Q3: 110 }, 'MONTHLY_VARIANCE')).toBe(110)
  })
})
