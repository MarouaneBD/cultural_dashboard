import { AppShell } from '@/components/layout/AppShell'
import { SubmissionsList } from '@/components/admin/SubmissionsList'

export default function AdminSubmissionsPage() {
  return (
    <AppShell title="اعتماد البيانات">
      <div className="max-w-5xl mx-auto">
        <SubmissionsList />
      </div>
    </AppShell>
  )
}
