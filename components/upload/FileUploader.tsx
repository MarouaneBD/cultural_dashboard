'use client'

import { useState, useRef } from 'react'
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

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()

      if ('rows' in body) {
        setPreview({ mode: 'activity', result: body })
      } else {
        setPreview({ mode: 'legacy', result: body })
      }
      setStatus('idle')
    } catch {
      setMessage('خطأ في الاتصال بالخادم')
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
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()

      if ('created' in body) {
        setMessage(`تم إنشاء ${body.created} مؤشر، تحديث ${body.updated} مؤشر`)
      } else {
        setMessage(`تم استيراد ${body.imported} سجل بنجاح`)
      }
      setStatus('done')
      setPreview(null)
    } catch {
      setMessage('خطأ في الاتصال بالخادم')
      setStatus('error')
    }
  }

  const hasRows = preview?.mode === 'activity'
    ? preview.result.rows.length > 0
    : (preview as Exclude<PreviewState, { mode: 'activity' }>)?.result?.valid?.length > 0

  const hasNoErrors = (preview?.result.errors.length ?? 1) === 0

  return (
    <div className="space-y-6">
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
          الأعمدة المتوقعة: الوحدة التنظيمية · الأنشطة · 2025 · المستهدف 2026 · 2026 Q1 · الفئة
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
                تأكيد الاستيراد
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
