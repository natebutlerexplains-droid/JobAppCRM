import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { getJobLeads } from './api'

export function JobLeads({ onError }) {
  const [isOpen, setIsOpen] = useState(false)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load job leads when component mounts
  useEffect(() => {
    loadLeads()
  }, [])

  const loadLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getJobLeads()
      setLeads(response.data || [])
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load job leads'
      setError(errorMsg)
      if (onError) {
        onError(errorMsg)
      }
      console.error('Error loading job leads:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header with toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">💡 Job Leads</h3>
            <Badge variant="outline" className="bg-blue-100 border-blue-300 text-blue-900">
              {leads.length}
            </Badge>
          </div>
          <span className="text-muted-foreground text-sm">
            {isOpen ? '▼' : '▶'}
          </span>
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="mt-4 space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded text-sm mb-4">
                {error}
              </div>
            )}

            {loading && (
              <div className="p-4 text-center text-muted-foreground">
                Loading job leads...
              </div>
            )}

            {!loading && leads.map(lead => (
              <div
                key={lead.id}
                className="border rounded p-4 bg-white hover:bg-blue-50 transition-colors border-l-4 border-l-blue-500"
              >
                <div className="mb-2">
                  <p className="font-medium text-sm text-foreground truncate">
                    {lead.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: {lead.sender}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lead.date_received).toLocaleDateString()}
                  </p>
                </div>

                {/* Email body preview */}
                {lead.body_excerpt && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {lead.body_excerpt.substring(0, 200)}...
                  </div>
                )}

                <div className="mt-3 text-xs text-blue-600 font-medium">
                  💼 Review this opportunity
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
