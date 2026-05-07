import { render } from '@testing-library/react'
import { SparklineChart } from './SparklineChart'

describe('SparklineChart', () => {
  it('renders one bar per data point', () => {
    const { container } = render(
      <SparklineChart data={[80, 85, 90, 95]} color="green" />
    )
    // The root flex div contains one child div per data point
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.children.length).toBe(4)
  })

  it('renders nothing for empty data', () => {
    const { container } = render(
      <SparklineChart data={[]} color="amber" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('last bar gets a different color than earlier bars', () => {
    const { container } = render(
      <SparklineChart data={[70, 72, 68, 75]} color="red" />
    )
    const wrapper = container.firstChild as HTMLElement
    const bars = Array.from(wrapper.children) as HTMLElement[]
    expect(bars.length).toBe(4)
    // Last bar has a different background than earlier bars
    expect(bars[3].style.background).not.toBe(bars[0].style.background)
  })
})
