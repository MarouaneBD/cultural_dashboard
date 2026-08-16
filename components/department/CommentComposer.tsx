'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface CommentComposerProps {
  pillarId: string
  mode: 'create' | 'edit'
  commentId?: string
  initialText?: string
  onDone: () => void
}

export function CommentComposer({
  pillarId,
  mode,
  commentId,
  initialText = '',
  onDone,
}: CommentComposerProps) {
  const [text, setText] = useState(initialText)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const url = mode === 'create'
        ? '/api/comments'
        : `/api/comments/${commentId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const body = mode === 'create'
        ? JSON.stringify({ pillarId, text: text.trim() })
        : JSON.stringify({ text: text.trim() })

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'حدث خطأ')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pillarId] })
      onDone()
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  const remaining = 500 - text.length

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setError(null) }}
        maxLength={500}
        rows={3}
        placeholder="اكتب تعليقك هنا..."
        className="font-cairo text-[13px] rounded-xl p-3 resize-none w-full"
        style={{
          background: 'var(--bg-alt)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-jb text-[10px]" style={{ color: remaining < 50 ? '#dc2626' : 'var(--ink-muted)' }}>
          {remaining} حرف متبقٍ
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDone}
            className="font-cairo text-[12px] px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-alt)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
          >
            إلغاء
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!text.trim() || mutation.isPending}
            className="font-cairo text-[12px] px-4 py-1.5 rounded-lg"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              opacity: !text.trim() || mutation.isPending ? 0.5 : 1,
              cursor: !text.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {mutation.isPending ? '...' : 'إرسال'}
          </button>
        </div>
      </div>
      {error && (
        <p className="font-cairo text-[12px]" style={{ color: '#dc2626' }}>{error}</p>
      )}
    </div>
  )
}
