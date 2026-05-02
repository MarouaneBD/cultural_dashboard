import type { UploadValidationResult } from '@/types'

interface ValidationPreviewProps {
  result: UploadValidationResult
}

export function ValidationPreview({ result }: ValidationPreviewProps) {
  return (
    <div className="space-y-4">
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            {result.errors.length} أخطاء في الملف
          </p>
          <ul className="text-xs text-red-600 space-y-1">
            {result.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {result.valid.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">
            {result.valid.length} سجل جاهز للاستيراد
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500">
                <th className="text-right p-2 border">KPI ID</th>
                <th className="text-right p-2 border">الفترة</th>
                <th className="text-right p-2 border">السنة</th>
                <th className="text-right p-2 border">القيمة</th>
                <th className="text-right p-2 border">المنطقة</th>
              </tr>
            </thead>
            <tbody>
              {result.valid.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border font-mono">{row.kpiId}</td>
                  <td className="p-2 border">{row.period}</td>
                  <td className="p-2 border">{row.year}</td>
                  <td className="p-2 border tabular-nums">{row.value.toLocaleString('ar-AE')}</td>
                  <td className="p-2 border">{row.region ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
