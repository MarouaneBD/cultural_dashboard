import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

// Mock next/link and next/navigation (used inside Sidebar)
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('Sidebar', () => {
  it('renders all four pillar navigation links in Arabic', () => {
    render(<Sidebar />)
    expect(screen.getByText('التعليم الإسلامي')).toBeInTheDocument()
    expect(screen.getByText('القرآن الكريم')).toBeInTheDocument()
    expect(screen.getByText('كفالة المعلمين')).toBeInTheDocument()
    expect(screen.getByText('المنح الجامعية')).toBeInTheDocument()
  })

  it('renders the division name in the header', () => {
    render(<Sidebar />)
    expect(screen.getByText('شؤون الإسلامية')).toBeInTheDocument()
  })

  it('renders dashboard home link', () => {
    render(<Sidebar />)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
  })
})
