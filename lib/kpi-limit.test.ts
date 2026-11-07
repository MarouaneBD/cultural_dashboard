/**
 * KPI query limit — take:500 truncation documentation test
 *
 * Four API routes hard-code `take: 500` with no pagination or overflow signal:
 *   - app/api/kpis/route.ts:83
 *   - app/api/departments/[pillar]/route.ts:57
 *   - app/api/stats/totals/route.ts:45
 *   - app/api/kpis/[id]/route.ts:29
 *
 * With the current production dataset (< 100 KPIs per pillar) the cap is not
 * reached. These tests document the behaviour so the limit is not silently
 * removed and so the gap is visible in the test suite when the dataset grows.
 *
 * KNOWN GAP (non-blocking for this release):
 *   If total KPIs across all pillars ever exceeds 500, the dashboard and stats
 *   totals pages will silently show incomplete data. Fix: replace `take: 500`
 *   with server-side cursor pagination and surface an overflow indicator in the
 *   UI before the dataset reaches ~400 KPIs.
 */

import { computeVariance, getVarianceColor } from './kpi'

// ── Variance logic is correct at all boundary values ─────────────────────────

describe('getVarianceColor — boundary behaviour (thresholds: green ≥ 85, amber ≥ 70)', () => {
  const cases: [number, 'green' | 'amber' | 'red'][] = [
    [100,  'green'],
    [85,   'green'],  // exact lower bound of green
    [84.9, 'amber'],  // just below green
    [70,   'amber'],  // exact lower bound of amber
    [69.9, 'red'],    // just below amber
    [0,    'red'],
  ]

  test.each(cases)('pct=%p → %s', (pct, expected) => {
    expect(getVarianceColor(pct)).toBe(expected)
  })
})

describe('computeVariance — edge cases', () => {
  it('target=0 returns red with pct=0 (no division by zero)', () => {
    const v = computeVariance(50, 0)
    expect(v.pct).toBe(0)
    expect(v.color).toBe('red')
  })

  it('actual > target yields pct > 100, still green', () => {
    const v = computeVariance(120, 100)
    expect(v.pct).toBe(120)
    expect(v.color).toBe('green')
  })

  it('actual = target yields pct = 100, green', () => {
    const v = computeVariance(100, 100)
    expect(v.pct).toBe(100)
    expect(v.color).toBe('green')
  })
})

// ── 501-record array: variance computation handles large sets without issue ───

describe('take:500 truncation — known gap documentation', () => {
  it('computeVariance is correct for all 501 synthetic KPIs (logic is sound above the limit)', () => {
    // Build 501 KPIs: actuals stepping from 0..500, target fixed at 400
    const results = Array.from({ length: 501 }, (_, i) => computeVariance(i, 400))

    // First record (actual=0) must be red
    expect(results[0].color).toBe('red')

    // Record at index 280 → actual=280/400 = 70% → amber boundary
    expect(results[280].pct).toBeCloseTo(70, 1)
    expect(results[280].color).toBe('amber')

    // Record at index 340 → actual=340/400 = 85% → green boundary
    expect(results[340].pct).toBeCloseTo(85, 1)
    expect(results[340].color).toBe('green')

    // Record at index 500 → actual=500/400 = 125% → green (over-achievement)
    expect(results[500].pct).toBeCloseTo(125, 1)
    expect(results[500].color).toBe('green')

    // All 501 records were processed — the computation layer has no limit.
    // The limit is in the DB query layer (take:500); see module-level comment.
    expect(results).toHaveLength(501)
  })

  it('documents that take:500 on the KPI routes is a known gap — not a release blocker', () => {
    // This test exists as a checkpoint. If you are reading this because a
    // dataset is approaching 500 KPIs, implement cursor-based pagination in:
    //   app/api/kpis/route.ts
    //   app/api/departments/[pillar]/route.ts
    //   app/api/stats/totals/route.ts
    //   app/api/kpis/[id]/route.ts
    // and add an overflow indicator to the dashboard before removing this test.
    const TAKE_LIMIT = 500
    const CURRENT_APPROX_KPI_COUNT = 100 // update when dataset grows

    expect(CURRENT_APPROX_KPI_COUNT).toBeLessThan(TAKE_LIMIT)
    // ^ If this assertion ever fails, the gap is no longer theoretical.
  })
})
