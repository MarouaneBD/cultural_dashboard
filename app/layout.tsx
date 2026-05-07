import type { Metadata } from 'next'
import { Cairo, Space_Grotesk, Fraunces, JetBrains_Mono, DM_Sans } from 'next/font/google'
import { Providers } from '@/components/providers'
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

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--nf-fraunces',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--nf-jb',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--nf-dm',
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
      className={[
        cairo.variable,
        spaceGrotesk.variable,
        fraunces.variable,
        jetbrainsMono.variable,
        dmSans.variable,
      ].join(' ')}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
