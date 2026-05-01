import type { Metadata } from 'next'
import { Providers } from '@/components/providers'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'نظام التقارير التنفيذية — شؤون الإسلامية',
  description: 'لوحة متابعة مؤشرات الأداء التنفيذية',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
