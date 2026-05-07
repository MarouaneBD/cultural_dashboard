/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('renders the ERS brand abbreviation', () => {
    render(<Sidebar />)
    expect(screen.getByText('ERS')).toBeInTheDocument()
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
})
