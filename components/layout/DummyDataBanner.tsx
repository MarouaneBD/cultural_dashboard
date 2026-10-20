'use client'

import { useState, useEffect } from 'react'
import type { DivisionId } from '@/lib/divisions'

const DISMISS_KEY = 'institutional-support-banner-dismissed'

interface Props {
  division: DivisionId
}

export function DummyDataBanner({ division }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (division !== 'INSTITUTIONAL_SUPPORT') return
    const dismissed = sessionStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [division])

  if (!visible) return null

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border"
      style={{
        background: 'rgba(251,191,36,.10)',
        borderColor: 'rgba(251,191,36,.35)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ fontSize: '15px', flexShrink: 0 }}>⚠️</span>
        <p className="font-cairo text-[13px] leading-snug" style={{ color: 'var(--ink)' }}>
          البيانات المعروضة تجريبية لأغراض العرض — ستُستبدل عند رفع البيانات الفعلية
        </p>
      </div>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-[18px] leading-none transition-opacity hover:opacity-60"
        style={{ color: 'var(--ink-muted)' }}
        aria-label="إغلاق"
      >
        ×
      </button>
    </div>
  )
}
