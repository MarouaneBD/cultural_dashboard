/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
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
  it('renders the app name when open', () => {
    render(<Sidebar open={true} />)
    expect(screen.getByText('قطاع الثقافة')).toBeInTheDocument()
  })

  it('renders all seven department links when open', () => {
    render(<Sidebar open={true} />)
    expect(screen.getByText('ادارة التعليم')).toBeInTheDocument()
    expect(screen.getByText('ادارة ثقافة الأسرة')).toBeInTheDocument()
    expect(screen.getByText('مركز المعلومات الاسلامي')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - ذكور')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - اناث')).toBeInTheDocument()
    expect(screen.getByText('قسم الأيتام')).toBeInTheDocument()
    expect(screen.getByText('مكتب البرامج العلمية والأيتام')).toBeInTheDocument()
  })

  it('renders upload and audit links when open', () => {
    render(<Sidebar open={true} />)
    expect(screen.getByText('رفع البيانات')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
  })

  it('is visually hidden when open=false', () => {
    const { container } = render(<Sidebar open={false} />)
    const aside = container.querySelector('aside')!
    expect(aside.style.width).toBe('0px')
  })
})
