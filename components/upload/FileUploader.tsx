'use client'

import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { ValidationPreview } from './ValidationPreview'
import type { UploadValidationResult, ActivityUploadResult } from '@/types'

type PreviewState =
  | { mode: 'activity'; result: ActivityUploadResult }
  | { mode: 'legacy';   result: UploadValidationResult }

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [clearing, setClearing] = useState(false)

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setMessage(`خطأ ${res.status}: ${body?.error ?? 'خطأ في الخادم'}`)
        setStatus('error')
        return
      }

      if ('rows' in body) {
        setPreview({ mode: 'activity', result: body })
      } else {
        setPreview({ mode: 'legacy', result: body })
      }
      setStatus('idle')
    } catch (e) {
      setMessage(`خطأ في الاتصال بالخادم: ${String(e)}`)
      setStatus('error')
    }
  }

  async function handleCommit() {
    if (!activeFile) return
    setStatus('loading')

    try {
      const formData = new FormData()
      formData.append('file', activeFile)
      formData.append('dryRun', 'false')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const body = await res.json()
      if (!res.ok) {
        setMessage(`خطأ ${res.status}: ${body?.error ?? 'خطأ في الخادم'}`)
        setStatus('error')
        return
      }

      if ('created' in body) {
        setMessage(`تم إنشاء ${body.created} مؤشر، تحديث ${body.updated} مؤشر`)
      } else {
        setMessage(`تم استيراد ${body.imported} سجل بنجاح`)
      }
      setStatus('done')
      setPreview(null)
    } catch (e) {
      setMessage(`خطأ في الاتصال بالخادم: ${String(e)}`)
      setStatus('error')
    }
  }

  async function handleClearData() {
    if (!confirm('سيتم حذف جميع الأنشطة والبيانات المخزنة. هل أنت متأكد؟')) return
    setClearing(true)
    try {
      const res = await fetch('/api/admin/clear-data', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        setMessage(body?.error ?? 'فشل مسح البيانات')
        setStatus('error')
      } else {
        setMessage(`تم مسح ${body.kpis} نشاط و${body.actuals} قيمة فعلية`)
        setStatus('done')
        setPreview(null)
        setActiveFile(null)
      }
    } catch (e) {
      setMessage(`خطأ في الاتصال بالخادم: ${String(e)}`)
      setStatus('error')
    } finally {
      setClearing(false)
    }
  }

  const hasRows = preview
    ? preview.mode === 'activity'
      ? preview.result.rows.length > 0
      : preview.result.valid.length > 0
    : false

  const hasNoErrors = preview ? preview.result.errors.length === 0 : false

  return (
    <div className="space-y-6">
      {/* Clear database */}
      <div className="flex justify-end">
        <button
          onClick={handleClearData}
          disabled={clearing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <Trash2 size={14} />
          {clearing ? 'جاري المسح…' : 'مسح جميع البيانات'}
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="منطقة رفع الملف — انقر أو اسحب ملف Excel"
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#0f4024] transition-colors"
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <p className="text-slate-500 text-sm">اسحب ملف Excel أو CSV هنا، أو انقر للاختيار</p>
        <p className="text-xs text-slate-400 mt-1">
          الأعمدة المتوقعة: الوحدة التنظيمية · الأنشطة · نوع النشاط · 2025 · المستهدف 2026 · 2026 Q1 · الفئة
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {status === 'loading' && <p className="text-sm text-slate-500 text-center">جاري المعالجة...</p>}
      {status === 'done'    && <p className="text-sm text-emerald-700 font-medium text-center">{message}</p>}
      {status === 'error'   && <p className="text-sm text-red-700 font-medium text-center">{message}</p>}

      {preview && (
        <>
          <ValidationPreview {...preview} />
          {hasRows && hasNoErrors && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                {preview.mode === 'activity'
                  ? `تأكيد الاستيراد (${preview.result.rows.length} نشاط)`
                  : `تأكيد الاستيراد (${preview.result.valid.length} سجل)`
                }
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
