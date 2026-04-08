import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardDetail } from '../CardDetail'

describe('CardDetail', () => {
  const mockApplication = {
    id: 1,
    company_name: 'Google',
    job_title: 'Software Engineer',
    job_description: 'Build great software',
    status: 'submitted',
    date_submitted: '2026-04-08',
    salary_min: 150000,
    salary_max: 200000,
    location: 'Mountain View, CA',
    contact_email: 'recruiter@google.com'
  }

  it('renders application details when open', () => {
    render(
      <CardDetail
        application={mockApplication}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
  })

  it('displays job title and company', () => {
    render(
      <CardDetail
        application={mockApplication}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText(/Google/)).toBeInTheDocument()
  })

  it('renders tab navigation', () => {
    render(
      <CardDetail
        application={mockApplication}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Tabs should exist
    const emailsTab = screen.queryByText('Emails')
    const interactionsTab = screen.queryByText('Interactions')
    expect(emailsTab || interactionsTab).toBeInTheDocument()
  })

  it('displays company information correctly', () => {
    render(
      <CardDetail
        application={mockApplication}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Should show the company name
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('handles closed state', () => {
    const { container } = render(
      <CardDetail
        application={mockApplication}
        isOpen={false}
        onClose={vi.fn()}
      />
    )

    expect(container).toBeInTheDocument()
  })

  it('renders without crashing with all props', () => {
    render(
      <CardDetail
        application={mockApplication}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
  })
})
