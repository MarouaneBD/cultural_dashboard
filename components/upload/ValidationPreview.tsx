import type { ActivityUploadResult } from '@/types'
import { DEPT_MAP } from '@/lib/departments'
import { REPORTING_YEAR } from '@/lib/config'

type Props = { mode: 'activity'; result: ActivityUploadResult }

export function ValidationPreview(props: Props) {
  const errors = props.result.errors

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            {errors.length} أخطاء في الملف
          </p>
          <ul className="text-xs text-red-600 space-y-1">
            {errors.map((e, i) => <li key={i}>{e.message}</li>)}
          </ul>
        </div>
      )}

      {props.result.rows.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            {props.result.rows.length} نشاط جاهز للاستيراد
          </p>
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
              {props.result.rows.map((row, i) => (
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
