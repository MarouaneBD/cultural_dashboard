import { NextRequest, NextResponse } from 'next/server'
import { Pillar } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { DeptData } from '@/types/department'

const UNIT_DISPLAY: Record<string, string> = {
  PERCENT: '%',
  COUNT: '',
  CURRENCY: 'AED',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const QUARTERS = ['Q1','Q2','Q3','Q4'] as const

function unitDisplay(u: string) { return UNIT_DISPLAY[u] ?? '' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pillar: string }> }
) {
  const { pillar } = await params

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: {
        pillar: pillar as Pillar,
        // Exclude the generic placeholder KPI — it is a computed ratio,
        // not a real departmental metric, and ships with dummy actuals only.
        NOT: { nameAr: 'المتحقق من المستهدف' },
      },
      include: {
        actuals: { where: { year: { in: [2025, 2026] } } },
        targets: { where: { year: 2026 } },
      },
    })

    if (!kpis.length) return NextResponse.json(null)

    // ── Last year (2025) ─────────────────────────────────────────────────────

    const lastYearKpis = kpis
      .map(k => {
        const a = k.actuals.find(x => x.year === 2025 && x.period === 'ANNUAL')
        if (!a) return null
        return { labelAr: k.nameAr, value: Math.round(Number(a.value)), unit: unitDisplay(k.unit), icon: 'TrendingUp' }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    // Category breakdown: count activities per category
    const catMap = new Map<string, number>()
    for (const k of kpis) {
      const cat = k.owner ?? 'أخرى'
      catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
    }
    const categoryBreakdown = Array.from(catMap.entries()).map(([nameAr, value]) => ({ nameAr, value }))

    // Determine dominant unit to decide whether to split targets by period
    const isPercent = kpis.every(k => k.unit === 'PERCENT')

    // Quarterly comparison 2025: use real Q1-Q4 if available, else distribute annual evenly
    const quarterlyComparison = QUARTERS.map(q => {
      const vals = kpis
        .map(k => k.actuals.find(a => a.year === 2025 && a.period === q)?.value ?? null)
        .filter((v): v is number => v !== null)
      const annualVals = kpis
        .map(k => k.actuals.find(a => a.year === 2025 && a.period === 'ANNUAL')?.value ?? null)
        .filter((v): v is number => v !== null)
      const achieved = vals.length
        ? vals.reduce((s, v) => s + v, 0) / vals.length
        : annualVals.length
          ? isPercent
            ? annualVals.reduce((s, v) => s + v, 0) / annualVals.length
            : annualVals.reduce((s, v) => s + v, 0) / annualVals.length / 4
          : 0
      // For PERCENT KPIs, quarterly target = annual target (it's a rate, not a total)
      // For COUNT/CURRENCY, divide annual target by 4
      const tVals = kpis.map(k => k.targets.find(t => t.period === 'ANNUAL')?.value ?? null).filter((v): v is number => v !== null)
      const annualTargetAvgQ = tVals.length ? tVals.reduce((s, v) => s + v, 0) / tVals.length : 100
      const target = isPercent ? annualTargetAvgQ : annualTargetAvgQ / 4
      return { quarter: q, achieved: Math.round(achieved), target: Math.max(Math.round(target), 1) }
    })

    // Monthly activity 2025: distribute annual average evenly across 12 months
    const annualAvg = lastYearKpis.length
      ? lastYearKpis.reduce((s, k) => s + k.value, 0) / lastYearKpis.length
      : 0
    const monthlyActivity = MONTHS.map(month => ({ month, value: Math.round(annualAvg) }))

    // ── Current year (2026) ──────────────────────────────────────────────────

    const currentTargets = kpis
      .map(k => {
        const annualTarget = k.targets.find(t => t.period === 'ANNUAL')
        if (!annualTarget) return null
        // Use most recent available actual (prefer Q4>Q3>Q2>Q1)
        const orderedPeriods = ['Q4','Q3','Q2','Q1'] as const
        const latestActual = orderedPeriods
          .map(p => k.actuals.find(a => a.year === 2026 && a.period === p))
          .find(Boolean)
        const lastYearActual = k.actuals.find(a => a.year === 2025 && a.period === 'ANNUAL')
        const annualTargetVal = Math.round(Number(annualTarget.value))
        const quarterlyTargetVal = isPercent ? annualTargetVal : Math.max(Math.round(annualTargetVal / 4), 1)
        const quarters = QUARTERS.map(q => {
          const qa = k.actuals.find(a => a.year === 2026 && a.period === q)
          const qt = k.targets.find(t => t.period === q)
          return {
            q,
            actual: qa ? Math.round(Number(qa.value)) : null,
            target: qt ? Math.round(Number(qt.value)) : quarterlyTargetVal,
          }
        })
        return {
          labelAr: k.nameAr,
          target: annualTargetVal,
          current: Math.round(Number(latestActual?.value ?? 0)),
          unit: unitDisplay(k.unit),
          lastYearValue: lastYearActual ? Math.round(Number(lastYearActual.value)) : null,
          quarters,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    // Monthly progress 2026: Q1 actual spread across Jan-Mar, null for future months
    const q1Vals = kpis
      .map(k => k.actuals.find(a => a.year === 2026 && a.period === 'Q1')?.value ?? null)
      .filter((v): v is number => v !== null)
    const q1Avg = q1Vals.length ? q1Vals.reduce((s, v) => s + v, 0) / q1Vals.length : null
    const annualTargetAvg = currentTargets.length
      ? currentTargets.reduce((s, t) => s + t.target, 0) / currentTargets.length
      : 0
    // For PERCENT KPIs, monthly target = annual target (rate doesn't divide by month)
    // For COUNT/CURRENCY, divide by 12
    const monthlyTarget = isPercent
      ? Math.max(Math.round(annualTargetAvg), 1)
      : Math.max(Math.round(annualTargetAvg / 12), 1)

    const monthlyProgress = MONTHS.map((month, i) => ({
      month,
      actual: i < 3 && q1Avg !== null ? Math.round(q1Avg) : null,
      target: monthlyTarget,
    }))

    const data: DeptData = {
      lastYear: { year: 2025, kpis: lastYearKpis, monthlyActivity, categoryBreakdown, quarterlyComparison },
      currentYear: { year: 2026, targets: currentTargets, monthlyProgress },
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(`GET /api/departments/${pillar} failed`, err)
    return NextResponse.json(null)
  }
}
