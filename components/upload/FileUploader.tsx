'use client'

import { useState, useRef } from 'react'
import { ValidationPreview } from './ValidationPreview'
import type { UploadValidationResult } from '@/types'

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<UploadValidationResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleFile(file: File) {
    setActiveFile(file)
    setStatus('loading')
    setPreview(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('dryRun', 'true')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await res.json()
    setPreview(body)
    setStatus('idle')
  }

  async function handleCommit() {
    if (!activeFile) return
    setStatus('loading')

    const formData = new FormData()
    formData.append('file', activeFile)
    formData.append('dryRun', 'false')

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const body = await res.json()

    if (res.ok) {
      setMessage(`تم استيراد ${body.imported} سجل بنجاح`)
      setStatus('done')
      setPreview(null)
    } else {
      setMessage('حدث خطأ أثناء الاستيراد')
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-[#0f4024] transition-colors"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <p className="text-slate-500 text-sm">اسحب ملف Excel أو CSV هنا، أو انقر للاختيار</p>
        <p className="text-xs text-slate-400 mt-1">يدعم UTF-8 للنص العربي</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {status === 'loading' && <p className="text-sm text-slate-500 text-center">جاري المعالجة...</p>}
      {status === 'done' && <p className="text-sm text-emerald-700 font-medium text-center">{message}</p>}
      {status === 'error' && <p className="text-sm text-red-700 font-medium text-center">{message}</p>}

      {preview && (
        <>
          <ValidationPreview result={preview} />
          {preview.valid.length > 0 && preview.errors.length === 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleCommit}
                className="bg-[#0f4024] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#0f4024]/90"
              >
                تأكيد الاستيراد ({preview.valid.length} سجل)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
