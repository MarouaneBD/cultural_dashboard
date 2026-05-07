import { render, screen, fireEvent } from '@testing-library/react'
import { DrillDownModal } from './DrillDownModal'
import type { KpiWithVariance } from '@/types'

const kpi: KpiWithVariance = {
  id: 'k1',
  nameAr: 'عدد المراكز الإسلامية',
  pillar: 'EDUCATION',
  unit: 'COUNT',
  variance: { actual: 100, target: 120, pct: 83.3, color: 'red' },
  sparkline: [80, 88, 95, 100],
}

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { region: 'أبوظبي', actual: 40, target: 50, variance: { actual: 40, target: 50, pct: 80, color: 'red' } },
      { region: 'دبي', actual: 60, target: 70, variance: { actual: 60, target: 70, pct: 85.7, color: 'amber' } },
    ],
    isLoading: false,
    error: null,
  }),
}))

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('year=2026&period=ANNUAL'),
}))

describe('DrillDownModal', () => {
  it('renders the KPI name in the modal header', () => {
    render(<DrillDownModal kpi={kpi} onClose={() => {}} />)
    expect(screen.getByText('عدد المراكز الإسلامية')).toBeInTheDocument()
  })

  it('renders regional breakdown rows', () => {
    render(<DrillDownModal kpi={kpi} onClose={() => {}} />)
    expect(screen.getByText('أبوظبي')).toBeInTheDocument()
    expect(screen.getByText('دبي')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn()
    render(<DrillDownModal kpi={kpi} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /إغلاق/ }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape key press', () => {
    const onClose = jest.fn()
    render(<DrillDownModal kpi={kpi} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
