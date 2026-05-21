'use client'

import { MonthlyTrendChart } from './charts/MonthlyTrendChart'
import { QuarterlyBarChart } from './charts/QuarterlyBarChart'
import { CategoryDonutChart } from './charts/CategoryDonutChart'
import type { DeptData } from '@/types/department'

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
      <p className="font-cairo text-[12px] font-semibold mb-3 text-right" style={{ color: 'var(--ink-soft)' }}>{title}</p>
      {children}
    </div>
  )
}

interface Props {
  data: DeptData['lastYear']
  currentYear: DeptData['currentYear']
  accentColor: string
}

export function LastYearReview({ data, currentYear, accentColor }: Props) {
  return (
    <section className="space-y-5">
      <p className="font-space font-semibold text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
        مراجعة الأداء · {data.year}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="منحنى النشاط الشهري">
          <MonthlyTrendChart
            lastYear={data.monthlyActivity}
            currentYear={currentYear.monthlyProgress}
            lastYearLabel={`${data.year}`}
            currentYearLabel={`${currentYear.year}`}
            accentColor={accentColor}
          />
        </ChartCard>
        <ChartCard title="المقارنة الفصلية — إنجاز vs. مستهدف">
          <QuarterlyBarChart data={data.quarterlyComparison} accentColor={accentColor} />
        </ChartCard>
      </div>

      <ChartCard title="توزيع الأنشطة حسب الفئة">
        <CategoryDonutChart data={data.categoryBreakdown} accentColor={accentColor} />
      </ChartCard>
    </section>
  )
}
