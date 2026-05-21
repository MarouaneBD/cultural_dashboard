'use client'

import { Users, BookOpen, GraduationCap, Star, TrendingUp, BarChart2, PieChart, Clock, CheckCircle } from 'lucide-react'
import { MonthlyTrendChart } from './charts/MonthlyTrendChart'
import { QuarterlyBarChart } from './charts/QuarterlyBarChart'
import { CategoryDonutChart } from './charts/CategoryDonutChart'
import type { DeptData } from '@/types/department'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users, BookOpen, GraduationCap, Star, TrendingUp, BarChart2,
  PieChart, Clock, CheckCircle,
}

function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: string; color: string
}) {
  const Icon = ICON_MAP[icon] ?? TrendingUp
  const display = unit === '%'
    ? `${value}%`
    : value.toLocaleString('en')

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', borderTop: `3px solid ${color}`, boxShadow: 'var(--card-shadow)' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={16} strokeWidth={2} color={color} />
        </div>
        <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>{label}</span>
      </div>
      <p
        className="font-fraunces font-medium text-right leading-none"
        style={{ fontSize: '30px', color: 'var(--ink)', letterSpacing: '-.02em' }}
      >
        {display}
      </p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-3" style={{ color: 'var(--ink-muted)' }}>
      {children}
    </p>
  )
}

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
      <div>
        <SectionLabel>مراجعة الأداء · {data.year}</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.kpis.map(kpi => (
            <StatCard key={kpi.labelAr} label={kpi.labelAr} value={kpi.value} unit={kpi.unit} icon={kpi.icon} color={accentColor} />
          ))}
        </div>
      </div>

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
