/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname:    () => '/dashboard',
  useSearchParams: () => ({ get: () => null }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders the app name when expanded', () => {
    render(<Sidebar expanded={true} />)
    expect(screen.getByText('قطاع الثقافة')).toBeInTheDocument()
  })

  it('renders all seven department links when expanded', () => {
    render(<Sidebar expanded={true} />)
    expect(screen.getByText('ادارة التعليم')).toBeInTheDocument()
    expect(screen.getByText('ادارة ثقافة الأسرة')).toBeInTheDocument()
    expect(screen.getByText('مركز المعلومات الاسلامي')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - ذكور')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - اناث')).toBeInTheDocument()
    expect(screen.getByText('قسم الأيتام')).toBeInTheDocument()
    expect(screen.getByText('مكتب البرامج العلمية')).toBeInTheDocument()
  })

  it('renders upload and audit links when expanded', () => {
    render(<Sidebar expanded={true} />)
    expect(screen.getByText('رفع البيانات')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
  })

  it('collapses to icon-only rail when expanded=false', () => {
    const { container } = render(<Sidebar expanded={false} />)
    const aside = container.querySelector('aside')!
    expect(aside.style.width).toBe('60px')
  })
})
