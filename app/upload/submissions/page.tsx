import { AppShell } from '@/components/layout/AppShell'
import { SubmissionsStatus } from '@/components/upload/SubmissionsStatus'

export default function MySubmissionsPage() {
  return (
    <AppShell title="حالة طلبات الرفع">
      <div className="max-w-3xl mx-auto">
        <SubmissionsStatus />
      </div>
    </AppShell>
  )
}
