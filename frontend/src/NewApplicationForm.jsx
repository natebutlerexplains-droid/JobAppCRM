import { useState } from 'react'
import { createApplication } from './api'

export function NewApplicationForm({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    date_submitted: new Date().toISOString().split('T')[0],
    job_url: '',
    company_domain: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.company_name.trim()) {
      setError('Company name is required')
      return
    }
    if (!formData.job_title.trim()) {
      setError('Job title is required')
      return
    }
    if (!formData.date_submitted) {
      setError('Date submitted is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await createApplication({
        company_name: formData.company_name,
        job_title: formData.job_title,
        date_submitted: formData.date_submitted,
        job_url: formData.job_url || null,
        company_domain: formData.company_domain || null,
      })

      // Reset form and close
      setFormData({
        company_name: '',
        job_title: '',
        date_submitted: new Date().toISOString().split('T')[0],
        job_url: '',
        company_domain: '',
      })

      // Callback with new app data
      if (onSuccess) {
        onSuccess(response.data)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create application')
      console.error('Error creating application:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-background border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            New Application
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company Name *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g., Google"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Job Title *
              </label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g., Senior Software Engineer"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date Submitted */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Date Submitted *
              </label>
              <input
                type="date"
                name="date_submitted"
                value={formData.date_submitted}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Company Domain (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company Domain <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <input
                type="text"
                name="company_domain"
                value={formData.company_domain}
                onChange={handleChange}
                placeholder="e.g., google.com"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Job URL (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Job URL <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <input
                type="url"
                name="job_url"
                value={formData.job_url}
                onChange={handleChange}
                placeholder="e.g., https://google.com/jobs/123"
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded text-sm">
                {error}
              </div>
            )}

            {/* Button Group */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-input rounded text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
