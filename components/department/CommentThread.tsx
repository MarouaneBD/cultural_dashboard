'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { CommentComposer } from './CommentComposer'

interface CommentResponse {
  id: string
  pillarId: string
  text: string
  createdAt: string
  updatedAt: string
  author: { id: string; username: string; name: string | null }
}

interface CommentThreadProps {
  pillarId: string
  accentColor: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'الآن'
  if (mins < 60)  return `منذ ${mins} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  return `منذ ${days} يوم`
}

function Avatar({ username, color }: { username: string; color: string }) {
  return (
    <span
      className="font-jb text-[11px] font-bold flex-shrink-0 flex items-center justify-center rounded-full w-7 h-7"
      style={{ background: `${color}20`, color }}
    >
      {username[0]?.toUpperCase() ?? '؟'}
    </span>
  )
}

export function CommentThread({ pillarId, accentColor }: CommentThreadProps) {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [composerOpen, setComposerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const role   = status !== 'loading' ? (session?.user as any)?.role as string | undefined : undefined
  const userId = (session?.user as any)?.id as string | undefined
  const canWrite = role === 'ADMIN' || role === 'EDITOR'

  const { data: comments = [] as CommentResponse[], isLoading } = useQuery<CommentResponse[]>({
    queryKey: ['comments', pillarId],
    queryFn: () =>
      fetch(`/api/comments?pillarId=${pillarId}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status)),
    enabled: status !== 'loading',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/comments/${id}`, { method: 'DELETE' }).then(r => {
        if (!r.ok) throw new Error('فشل الحذف')
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', pillarId] })
    },
  })

  return (
    <div
      dir="rtl"
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-space font-semibold text-[11px] tracking-[.1em] uppercase" style={{ color: 'var(--ink)' }}>
          تعليقات التحليل
        </span>
        {canWrite && !composerOpen && (
          <button
            onClick={() => setComposerOpen(true)}
            className="font-cairo text-[12px] px-3 py-1.5 rounded-lg"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            + أضف تعليقاً
          </button>
        )}
      </div>

      {/* Composer — create mode */}
      {composerOpen && (
        <CommentComposer
          pillarId={pillarId}
          mode="create"
          onDone={() => setComposerOpen(false)}
        />
      )}

      {/* Comment list */}
      {isLoading ? (
        <p className="font-cairo text-[12px] text-center" style={{ color: 'var(--ink-muted)' }}>جاري التحميل...</p>
      ) : comments.length === 0 && !composerOpen ? (
        <p className="font-cairo text-[12px]" style={{ color: 'var(--ink-muted)' }}>لا توجد تعليقات بعد</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map(c => {
            const isAuthor = c.author.id === userId
            const canEdit  = canWrite && (isAuthor || role === 'ADMIN')
            const isEditing = editingId === c.id

            return (
              <li
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--hair)',
                }}
              >
                <Avatar username={c.author.username} color={accentColor} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="font-cairo text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>
                      {c.author.name ?? c.author.username}
                    </span>
                    <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>

                  {isEditing ? (
                    <CommentComposer
                      pillarId={pillarId}
                      mode="edit"
                      commentId={c.id}
                      initialText={c.text}
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <p className="font-cairo text-[13px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
                        {c.text}
                      </p>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {isAuthor && (
                            <button
                              onClick={() => setEditingId(c.id)}
                              className="font-jb text-[10px]"
                              style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              تعديل
                            </button>
                          )}
                          {confirmDeleteId === c.id ? (
                            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button
                                onClick={() => { deleteMutation.mutate(c.id); setConfirmDeleteId(null) }}
                                disabled={deleteMutation.isPending}
                                className="font-jb text-[10px]"
                                style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="font-jb text-[10px]"
                                style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                              >
                                إلغاء
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(c.id)}
                              className="font-jb text-[10px]"
                              style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
