import { render, screen } from '@testing-library/react'
import { KpiCard } from './KpiCard'
import type { KpiWithVariance } from '@/types'

// SparklineChart doesn't exist yet — mock it
jest.mock('@/components/charts/SparklineChart', () => ({
  SparklineChart: () => <div data-testid="sparkline" />,
}))

const baseKpi: KpiWithVariance = {
  id: 'kpi-1',
  nameAr: 'كفالات المعلمين النشطة',
  pillar: 'TEACHER_SPONSORSHIP',
  unit: 'COUNT',
  variance: { actual: 270, target: 300, pct: 90, color: 'amber' },
  sparkline: [240, 255, 263, 270],
}

describe('KpiCard', () => {
  it('renders the KPI Arabic name', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByText('كفالات المعلمين النشطة')).toBeInTheDocument()
  })

  it('renders actual value', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByText(/270/)).toBeInTheDocument()
  })

  it('renders variance percentage in the ring', () => {
    render(<KpiCard kpi={baseKpi} />)
    // formatVariancePct(90) = '90.0%' — now in SVG text inside the ring
    expect(screen.getByText(/90\.0%/)).toBeInTheDocument()
  })

  it('renders target value in footer', () => {
    render(<KpiCard kpi={baseKpi} />)
    // formatValue(300, 'COUNT') = '300'
    expect(screen.getByText(/300/)).toBeInTheDocument()
    expect(screen.getByText('المستهدف')).toBeInTheDocument()
  })

  it('applies amber styling for 90% variance', () => {
    const { container } = render(<KpiCard kpi={baseKpi} />)
    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument()
  })

  it('applies green styling when >95%', () => {
    const greenKpi: KpiWithVariance = {
      ...baseKpi,
      variance: { actual: 98, target: 100, pct: 98, color: 'green' },
    }
    const { container } = render(<KpiCard kpi={greenKpi} />)
    expect(container.querySelector('.bg-emerald-50')).toBeInTheDocument()
  })

  it('applies red styling when <85%', () => {
    const redKpi: KpiWithVariance = {
      ...baseKpi,
      variance: { actual: 80, target: 100, pct: 80, color: 'red' },
    }
    const { container } = render(<KpiCard kpi={redKpi} />)
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument()
  })

  it('renders the sparkline chart', () => {
    render(<KpiCard kpi={baseKpi} />)
    expect(screen.getByTestId('sparkline')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = jest.fn()
    render(<KpiCard kpi={baseKpi} onClick={onClick} />)
    screen.getByText('كفالات المعلمين النشطة').closest('button')!.click()
    expect(onClick).toHaveBeenCalled()
  })
})
