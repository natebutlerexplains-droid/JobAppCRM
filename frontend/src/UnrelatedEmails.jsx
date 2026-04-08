import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { getNonJobRelatedEmails } from './api'

export function UnrelatedEmails({ onError }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load non-job-related emails when component mounts
  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getNonJobRelatedEmails()
      setEmails(response.data || [])
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load unrelated emails'
      setError(errorMsg)
      if (onError) {
        onError(errorMsg)
      }
      console.error('Error loading unrelated emails:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header with toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">Unrelated Emails</h3>
            <Badge variant="outline" className="bg-gray-100 border-gray-300 text-gray-900">
              {emails.length}
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
                Loading emails...
              </div>
            )}

            {!loading && emails.map(email => (
              <div
                key={email.id}
                className="border rounded p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="mb-2">
                  <p className="font-medium text-sm text-foreground truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: {email.sender}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(email.date_received).toLocaleDateString()}
                  </p>
                </div>

                {/* Email body preview */}
                {email.body_excerpt && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {email.body_excerpt.substring(0, 200)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
