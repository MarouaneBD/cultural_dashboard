import { render } from '@testing-library/react'
import { SparklineChart } from './SparklineChart'

// Mock all Recharts — it doesn't render in jsdom
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <svg>{children}</svg>,
  Line: () => null,
  Tooltip: () => null,
}))

describe('SparklineChart', () => {
  it('renders without crashing with 4 data points', () => {
    const { container } = render(
      <SparklineChart data={[80, 85, 90, 95]} color="green" />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with empty data', () => {
    const { container } = render(
      <SparklineChart data={[]} color="amber" />
    )
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with red color', () => {
    const { container } = render(
      <SparklineChart data={[70, 72, 68, 75]} color="red" />
    )
    expect(container.firstChild).toBeTruthy()
  })
})
