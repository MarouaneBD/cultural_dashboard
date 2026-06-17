import type { Metadata } from 'next'
import { Cairo, Space_Grotesk } from 'next/font/google'
import { Providers } from '@/components/providers'
import { SplashScreen } from '@/components/layout/SplashScreen'
import '@/app/globals.css'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--nf-cairo',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--nf-space',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'لوحة تحكم قطاع الثقافة',
  description: 'لوحة متابعة مؤشرات الأداء التنفيذية — قطاع الثقافة',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={[cairo.variable, spaceGrotesk.variable].join(' ')}
    >
      <body>
        <Providers>
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  )
}
