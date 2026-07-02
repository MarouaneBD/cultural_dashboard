// generateInsights — derives 3–5 Arabic insight strings from dept data.
// Color-codes each insight: green = positive, amber = caution, red = at-risk.

import type { DeptData } from '@/types/department'
import type { VarianceColor } from '@/types'

export interface Insight {
  text: string
  color: VarianceColor
}

export function generateInsights(data: DeptData): Insight[] {
  const insights: Insight[] = []
  const { lastYear, currentYear } = data

  // ── 1. Best quarter last year ────────────────────────────────────────────
  if (lastYear.quarterlyComparison.length > 0) {
    const sorted = [...lastYear.quarterlyComparison].sort(
      (a, b) => b.achieved / b.target - a.achieved / a.target
    )
    const best = sorted[0]
    const bestPct = Math.round((best.achieved / best.target) * 100)
    insights.push({
      text: `أفضل أداء فصلي في ${lastYear.year} كان ${best.quarter} بنسبة إنجاز ${bestPct}%`,
      color: bestPct >= 90 ? 'green' : 'amber',
    })

    // ── 2. Worst quarter last year ───────────────────────────────────────────
    const worst = sorted[sorted.length - 1]
    const worstPct = Math.round((worst.achieved / worst.target) * 100)
    if (worstPct < 95) {
      insights.push({
        text: `${worst.quarter} كان الأضعف بنسبة ${worstPct}% — يُنصح بمراجعة أسباب التراجع`,
        color: worstPct < 85 ? 'red' : 'amber',
      })
    }
  }

  // ── 3. Current year target progress per KPI ──────────────────────────────
  for (const t of currentYear.targets) {
    const pct = t.lowerIsBetter
      ? (t.target / t.current) * 100
      : (t.current / t.target) * 100
    const rounded = Math.round(pct)
    const unit = t.unit || ''

    if (rounded >= 95) {
      insights.push({
        text: `مؤشر "${t.labelAr}" يسير بشكل ممتاز — تم إنجاز ${rounded}% من الهدف (${t.current}${unit} من ${t.target}${unit})`,
        color: 'green',
      })
    } else if (rounded < 80) {
      insights.push({
        text: `مؤشر "${t.labelAr}" يحتاج انتباهاً — الإنجاز الحالي ${rounded}% من الهدف (${t.current}${unit} من ${t.target}${unit})`,
        color: 'red',
      })
    } else if (rounded < 90) {
      insights.push({
        text: `مؤشر "${t.labelAr}" ضمن النطاق المقبول بنسبة ${rounded}% — يحتاج متابعة`,
        color: 'amber',
      })
    }

    if (insights.length >= 5) break
  }

  // ── 4. Monthly trend — last 3 available months ───────────────────────────
  const lastYearActuals = lastYear.monthlyActivity
    .map(m => m.value)
    .filter((v): v is number => v !== null)
  if (lastYearActuals.length >= 3) {
    const last3 = lastYearActuals.slice(-3)
    const isRising = last3[2] > last3[1] && last3[1] > last3[0]
    const isFalling = last3[2] < last3[1] && last3[1] < last3[0]
    if (isRising && insights.length < 5) {
      insights.push({
        text: `الأشهر الثلاثة الأخيرة من ${lastYear.year} تُظهر منحنى أداء تصاعدياً متواصلاً`,
        color: 'green',
      })
    } else if (isFalling && insights.length < 5) {
      insights.push({
        text: `لوحظ تراجع متواصل في آخر 3 أشهر من ${lastYear.year} — يستحق التحقيق`,
        color: 'amber',
      })
    }
  }

  return insights.slice(0, 5)
}
