/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

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
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { role: 'ADMIN', username: 'admin' } }, status: 'authenticated' }),
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders the division name when expanded', () => {
    render(<Sidebar expanded={true} />, { wrapper })
    // DEFAULT_DIVISION = CULTURE_RESEARCH, shortAr = 'الثقافة والبحوث'.
    // Appears in both the brand label and the division nav link.
    expect(screen.getAllByText('الثقافة والبحوث').length).toBeGreaterThan(0)
  })

  it('renders all eight CULTURE_RESEARCH department links when expanded', () => {
    render(<Sidebar expanded={true} />, { wrapper })
    expect(screen.getByText('ادارة التعليم')).toBeInTheDocument()
    expect(screen.getByText('ادارة ثقافة الأسرة')).toBeInTheDocument()
    expect(screen.getByText('مركز المعلومات الاسلامي')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - ذكور')).toBeInTheDocument()
    expect(screen.getByText('مشروع البر - اناث')).toBeInTheDocument()
    expect(screen.getByText('قسم الأيتام')).toBeInTheDocument()
    expect(screen.getByText('مكتب البرامج العلمية')).toBeInTheDocument()
    expect(screen.getByText('وحدة البحوث والمطبوعات')).toBeInTheDocument()
  })

  it('renders data entry and audit links when expanded', () => {
    render(<Sidebar expanded={true} />, { wrapper })
    expect(screen.getByText('إدخال البيانات')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
    expect(screen.getByText('إدارة المؤشرات')).toBeInTheDocument()
  })

  it('collapses to icon-only rail when expanded=false', () => {
    const { container } = render(<Sidebar expanded={false} />, { wrapper })
    const aside = container.querySelector('aside')!
    expect(aside.style.width).toBe('60px')
  })
})
