import { AppShell } from '@/components/layout/AppShell'
import { FileUploader } from '@/components/upload/FileUploader'

export default function UploadPage() {
  return (
    <AppShell title="رفع البيانات">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-slate-500 mb-6">
          ارفع ملف Excel أو CSV يحتوي على أعمدة: kpiId · period · year · value · region (اختياري)
        </p>
        <FileUploader />
      </div>
    </AppShell>
  )
}
