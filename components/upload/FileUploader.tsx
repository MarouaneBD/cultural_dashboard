// components/upload/FileUploader.tsx
'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ValidationPreview } from './ValidationPreview'
import type { ActivityUploadResult, UploadCommitResult, UploadSubmissionClient } from '@/types'
import { REPORTING_YEAR } from '@/lib/config'

type PreviewState = { mode: 'activity'; result: ActivityUploadResult }

export function FileUploader() {
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = sessionStatus !== 'loading' && session?.user?.role === 'ADMIN'
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [commitResult, setCommitResult] = useState<UploadCommitResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [clearing, setClearing] = useState(false)
  const qc = useQueryClient()

  const { data: submissionsData } = useQuery<UploadSubmissionClient[]>({
    queryKey: ['editor-submissions-count'],
    queryFn: () => fetch('/api/upload/submissions').then(r => r.json()),
    enabled: !isAdmin && sessionStatus === 'authenticated',
    refetchInterval: 30000,
  })
  const pendingCount = submissionsData
    ? submissionsData.reduce((sum, s) => sum + s.rows.filter(r => r.status === 'PENDING' || r.status === 'REJECTED').length, 0)
    : 0

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)
    setCommitResult(null)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', 'true')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      let body: Record<string, unknown> | null = null
      try { body = await res.json() } catch { /* non-JSON response */ }
      if (!res.ok) {
        setErrorMessage(`خطأ ${res.status} من الخادم — ${(body?.error as string | undefined) ?? 'حاول مجدداً'}`)
        setStatus('error')
        return
      }

      if (body !== null && 'rows' in body) {
        setPreview({ mode: 'activity', result: body as unknown as ActivityUploadResult })
        setStatus('idle')
      } else {
        setErrorMessage('خطأ: صيغة ملف غير مدعومة')
        setStatus('error')
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
      setStatus('error')
    }
  }

  async function handleCommit() {
    if (!activeFile) return
    setStatus('loading')
    setCommitResult(null)
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', activeFile)
      formData.append('dryRun', 'false')

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      let body: Record<string, unknown> | null = null
      try { body = await res.json() } catch { /* non-JSON response */ }
      if (!res.ok) {
        setErrorMessage(`خطأ ${res.status} من الخادم — ${(body?.error as string | undefined) ?? 'حاول مجدداً'}`)
        setStatus('error')
        return
      }

      if (body !== null && 'created' in body) {
        const r = body as unknown as UploadCommitResult
        setCommitResult(r)
        setStatus('idle')
        setPreview(null)

        if (r.staged > 0) {
          qc.invalidateQueries({ queryKey: ['editor-submissions-count'] })
        }
      } else {
        setErrorMessage('خطأ: رد غير متوقع من الخادم')
        setStatus('error')
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
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
        setErrorMessage(body?.error ?? 'فشل مسح البيانات')
        setStatus('error')
      } else {
        setErrorMessage('')
        setCommitResult(null)
        setPreview(null)
        setActiveFile(null)
        // Show a simple success inline — no state for this, reuse error field with green styling omitted
        // (commit result panel will be empty; the confirm dialog already informed user)
      }
    } catch {
      setErrorMessage('تعذّر الاتصال بالخادم — تحقق من اتصالك وحاول مجدداً')
      setStatus('error')
    } finally {
      setClearing(false)
    }
  }

  const hasRows = preview ? preview.result.rows.length > 0 : false
  const hasNoScopeErrors = preview ? preview.result.scopeErrors.length === 0 : false
  const hasNoParseErrors = preview ? preview.result.parseErrors.length === 0 : false

  return (
    <div className="space-y-6">
      {/* Clear database — admin only */}
      {isAdmin && (
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
      )}

      {!isAdmin && pendingCount > 0 && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 text-sm"
          style={{ background: 'rgba(184,130,42,.12)', border: '1px solid rgba(184,130,42,.3)', color: 'var(--ink)' }}
        >
          <span>لديك <strong>{pendingCount}</strong> {pendingCount === 1 ? 'صف' : 'صفاً'} بانتظار المراجعة</span>
          <Link href="/upload/submissions" className="text-xs px-3 py-1 rounded-lg text-white" style={{ background: 'var(--accent)' }}>
            عرض التفاصيل
          </Link>
        </div>
      )}

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
          {`الأعمدة المتوقعة: الوحدة التنظيمية · الأنشطة · نوع النشاط · ${REPORTING_YEAR - 1} · المستهدف ${REPORTING_YEAR} · ${REPORTING_YEAR} Q1 · الفئة`}
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
      {status === 'error' && <p className="text-sm text-red-700 font-medium text-center">{errorMessage}</p>}

      {/* Structured commit result */}
      {commitResult && (
        <div className="rounded-xl border p-4 space-y-1.5 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--card-bg)' }}>
          {commitResult.updated > 0 && (
            <p style={{ color: '#059669' }}>✓ {commitResult.updated} مؤشر حُدِّث مباشرة</p>
          )}
          {commitResult.staged > 0 && (
            <p style={{ color: '#b8822a' }}>⏳ {commitResult.staged} صف بانتظار موافقة المدير</p>
          )}
          {commitResult.scopeErrors.length > 0 && (
            <div>
              <p style={{ color: '#dc2626' }}>✗ {commitResult.scopeErrors.length} صف مرفوض: خارج نطاق الصلاحية</p>
              <p className="text-xs mt-0.5 mr-4" style={{ color: '#dc2626' }}>{commitResult.scopeErrors[0].message}</p>
            </div>
          )}
          {commitResult.dbErrors.length > 0 && (
            <p style={{ color: '#dc2626' }}>✗ {commitResult.dbErrors.length} صف فشل بسبب خطأ في الخادم</p>
          )}
          {commitResult.updated === 0 && commitResult.staged === 0 && commitResult.scopeErrors.length === 0 && commitResult.dbErrors.length === 0 && (
            <p style={{ color: 'var(--ink-muted)' }}>لم يتم معالجة أي صفوف</p>
          )}
        </div>
      )}

      {preview && (
        <>
          <ValidationPreview {...preview} />
          {hasRows && hasNoScopeErrors && hasNoParseErrors && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                تأكيد الاستيراد ({preview.result.rows.length} نشاط)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
