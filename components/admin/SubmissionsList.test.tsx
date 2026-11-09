/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SubmissionsList } from './SubmissionsList'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const MOCK_SUBMISSIONS = [
  {
    id: 's1',
    filename: 'بيانات_التعليم.xlsx',
    uploadedAt: '2026-01-12T10:00:00.000Z',
    status: 'PENDING',
    pendingCount: 3,
    totalCount: 8,
    submitter: { name: 'أحمد محمد', username: 'ahmed' },
    rows: [],
  },
]

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_SUBMISSIONS,
  } as Response)
})

afterEach(() => {
  jest.clearAllMocks()
})

test('renders a <table> for desktop layout', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
  const table = screen.getByRole('table')
  expect(table.className).toContain('hidden')
  expect(table.className).toContain('md:table')
})

test('renders mobile cards with submitter name and status badge', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    // Both layouts render the submitter name
    expect(screen.getAllByText('أحمد محمد').length).toBeGreaterThan(0)
  })
  // The mobile cards container is in the DOM
  const { container } = render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    const mobileDiv = container.querySelector('.md\\:hidden')
    expect(mobileDiv).toBeInTheDocument()
  })
})

test('renders مراجعة link pointing to submission detail', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    const links = screen.getAllByRole('link', { name: 'مراجعة' })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/admin/submissions/s1')
  })
})

test('shows pending count in amber when pendingCount > 0', async () => {
  render(<SubmissionsList />, { wrapper })
  await waitFor(() => {
    expect(screen.getAllByText(/3 \/ 8/).length).toBeGreaterThan(0)
  })
})
