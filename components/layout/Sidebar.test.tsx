/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'

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
  it('renders the app name', () => {
    render(<Sidebar />)
    expect(screen.getByText('قطاع الثقافة')).toBeInTheDocument()
  })

  it('renders all four pillar links', () => {
    render(<Sidebar />)
    expect(screen.getByText('التعليم الإسلامي')).toBeInTheDocument()
    expect(screen.getByText('القرآن الكريم')).toBeInTheDocument()
    expect(screen.getByText('كفالة المعلمين')).toBeInTheDocument()
    expect(screen.getByText('المنح الجامعية')).toBeInTheDocument()
  })

  it('renders upload and audit links', () => {
    render(<Sidebar />)
    expect(screen.getByText('رفع البيانات')).toBeInTheDocument()
    expect(screen.getByText('سجل المراجعة')).toBeInTheDocument()
  })

  it('collapses and hides labels when toggle is clicked', () => {
    render(<Sidebar />)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /طي الشريط الجانبي/ }))
    expect(screen.queryByText('الرئيسية')).not.toBeInTheDocument()
  })

  it('expands again after a second toggle click', () => {
    render(<Sidebar />)
    const btn = screen.getByRole('button', { name: /طي الشريط الجانبي/ })
    fireEvent.click(btn)
    fireEvent.click(screen.getByRole('button', { name: /توسيع الشريط الجانبي/ }))
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
  })
})
