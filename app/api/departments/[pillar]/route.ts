import { NextRequest, NextResponse } from 'next/server'
import { Pillar } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeYtd } from '@/lib/kpi'
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

    // Category breakdown: count activities per category — exclude revenue (درهم)
    const catMap = new Map<string, number>()
    for (const k of kpis) {
      if (k.owner?.trim() === 'درهم') continue   // revenue shown separately on main page
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
        // Derive 2025 annual: prefer ANNUAL row, else compute YTD from quarterly rows
        const lastYearAnnualRow = k.actuals.find(a => a.year === 2025 && a.period === 'ANNUAL')
        let lastYearActual: { value: number | string } | null = lastYearAnnualRow ?? null
        if (!lastYearActual) {
          const q2025Map: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
          for (const a of k.actuals) {
            if (a.year === 2025 && (QUARTERS as readonly string[]).includes(a.period)) {
              q2025Map[a.period as 'Q1' | 'Q2' | 'Q3' | 'Q4'] = Number(a.value)
            }
          }
          const ytd2025 = computeYtd(q2025Map, k.activityType)
          if (ytd2025 !== null) lastYearActual = { value: ytd2025 }
        }
        const isKpiPercent = k.unit === 'PERCENT'

        // Derive annual target: explicit ANNUAL row → sum of quarterly rows → 0
        let annualTargetVal: number
        if (annualTarget) {
          annualTargetVal = Math.round(Number(annualTarget.value))
        } else {
          const qSum = QUARTERS.reduce((s, q) => {
            const qt = k.targets.find(t => t.period === q)
            return s + (qt ? Math.round(Number(qt.value)) : 0)
          }, 0)
          annualTargetVal = qSum
        }

        const quarterlyTargetVal = isKpiPercent ? annualTargetVal : Math.max(Math.round(annualTargetVal / 4), 1)
        const quarters = QUARTERS.map(q => {
          const qa = k.actuals.find(a => a.year === 2026 && a.period === q)
          const qt = k.targets.find(t => t.period === q)
          return {
            q,
            actual: qa ? Math.round(Number(qa.value)) : null,
            target: qt ? Math.round(Number(qt.value)) : quarterlyTargetVal,
          }
        })
        // current: use activity type to decide cumulative sum vs latest snapshot
        const actType = k.activityType
        const quarterMap: Partial<Record<'Q1'|'Q2'|'Q3'|'Q4', number>> = {}
        for (const qp of quarters) {
          if (qp.actual !== null) quarterMap[qp.q] = qp.actual
        }
        const ytd = computeYtd(quarterMap, actType)
        const current = ytd !== null ? Math.round(ytd) : 0
        return {
          labelAr: k.nameAr,
          target: annualTargetVal,
          current,
          unit: unitDisplay(k.unit),
          lastYearValue: lastYearActual ? Math.round(Number(lastYearActual.value)) : null,
          quarters,
        }
      })

    // Monthly progress 2026: spread all available quarters across their months.
    // Cumulative KPIs show a running total; snapshot KPIs show that quarter's value.
    // We compute per-KPI monthly values then average across KPIs.
    const perKpiMonthly: (number | null)[][] = kpis.map(k => {
      const actType = k.activityType
      const qVals: Partial<Record<string, number>> = {}
      for (const q of QUARTERS) {
        const a = k.actuals.find(x => x.year === 2026 && x.period === q)
        if (a) qVals[q] = Number(a.value)
      }
      return MONTHS.map((_, i) => {
        const qIdx = Math.floor(i / 3)       // 0=Q1, 1=Q2, 2=Q3, 3=Q4
        const qKey = QUARTERS[qIdx]
        if (!(qKey in qVals)) return null    // quarter not yet available
        if (actType === 'CUMULATIVE') {
          // Running total: sum all quarters up to and including this one
          let total = 0
          for (let j = 0; j <= qIdx; j++) {
            const v = qVals[QUARTERS[j]]
            if (v === undefined) return null // gap in data — can't compute running total
            total += v
          }
          return total
        } else {
          return qVals[qKey] ?? null
        }
      })
    })

    const annualTargetAvg = currentTargets.length
      ? currentTargets.reduce((s, t) => s + t.target, 0) / currentTargets.length
      : 0
    const monthlyTarget = isPercent
      ? Math.max(Math.round(annualTargetAvg), 1)
      : Math.max(Math.round(annualTargetAvg / 12), 1)

    const monthlyProgress = MONTHS.map((month, i) => {
      const vals = perKpiMonthly.map(kpiMonths => kpiMonths[i]).filter((v): v is number => v !== null)
      return {
        month,
        actual: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null,
        target: monthlyTarget,
      }
    })

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
