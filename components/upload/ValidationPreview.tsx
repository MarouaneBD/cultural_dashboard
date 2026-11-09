import type { ActivityUploadResult } from '@/types'
import { DEPT_MAP } from '@/lib/departments'
import { REPORTING_YEAR } from '@/lib/config'

type Props = { mode: 'activity'; result: ActivityUploadResult }

function ErrorList({ title, errors, color }: {
  title: string
  errors: Array<{ row: number; message: string }>
  color: 'red' | 'amber'
}) {
  if (errors.length === 0) return null
  const styles = color === 'red'
    ? { border: 'border-red-200', bg: 'bg-red-50', heading: 'text-red-700', text: 'text-red-600' }
    : { border: 'border-amber-200', bg: 'bg-amber-50', heading: 'text-amber-700', text: 'text-amber-600' }
  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4`}>
      <p className={`text-sm font-semibold ${styles.heading} mb-2`}>{title} ({errors.length})</p>
      <ul className={`text-xs ${styles.text} space-y-1`}>
        {errors.map((e, i) => <li key={i}>صف {e.row}: {e.message}</li>)}
      </ul>
    </div>
  )
}

export function ValidationPreview(props: Props) {
  const { parseErrors, scopeErrors, rows } = props.result

  return (
    <div className="space-y-4">
      <ErrorList title="أخطاء الصلاحيات" errors={scopeErrors} color="red" />
      <ErrorList title="أخطاء تحليل الملف" errors={parseErrors} color="amber" />

      {rows.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">{rows.length} نشاط جاهز للاستيراد</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-right p-2 border">الوحدة التنظيمية</th>
                <th className="text-right p-2 border">الأنشطة</th>
                <th className="text-right p-2 border">نوع النشاط</th>
                <th className="text-right p-2 border">الفئة</th>
                <th className="text-right p-2 border">{REPORTING_YEAR - 1}</th>
                <th className="text-right p-2 border">المستهدف {REPORTING_YEAR}</th>
                <th className="text-right p-2 border">Q1 {REPORTING_YEAR}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border font-cairo">{DEPT_MAP[row.pillar]?.labelAr ?? row.pillar}</td>
                  <td className="p-2 border font-cairo">{row.nameAr}</td>
                  <td className="p-2 border font-cairo">
                    {row.activityType === 'CUMULATIVE' ? 'تراكمي' : 'شهري'}
                  </td>
                  <td className="p-2 border">{row.category ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.actual2025?.toLocaleString('ar-AE') ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.target2026?.toLocaleString('ar-AE') ?? '—'}</td>
                  <td className="p-2 border tabular-nums">{row.actuals.Q1?.toLocaleString('ar-AE') ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
