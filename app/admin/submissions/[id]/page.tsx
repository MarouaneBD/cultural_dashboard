import { AppShell } from '@/components/layout/AppShell'
import { SubmissionDetail } from '@/components/admin/SubmissionDetail'
import Link from 'next/link'

export default async function SubmissionDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return (
    <AppShell title="مراجعة طلب الرفع">
      <div className="max-w-5xl mx-auto space-y-4">
        <Link href="/admin/submissions" className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          ← العودة إلى القائمة
        </Link>
        <SubmissionDetail submissionId={id} />
      </div>
    </AppShell>
  )
}
