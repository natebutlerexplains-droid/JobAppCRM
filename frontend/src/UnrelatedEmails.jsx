import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { getNonJobRelatedEmails, reclassifyEmails, correctEmailClassification, trashEmail, formatDate } from './api'

// Predefined reason codes for user corrections
const REASON_CODES = {
  application_confirmation: [
    { code: 'OBVIOUS_LANGUAGE', label: "Contains obvious confirmation language (e.g. 'Thank you for applying')" },
    { code: 'KNOWN_HR_PLATFORM', label: "From a known HR platform missed by rules (ADP, Workday, Greenhouse)" },
    { code: 'CLEAR_SUBJECT', label: "Subject line clearly indicates application" },
    { code: 'LINKEDIN_PATTERN', label: "LinkedIn confirmation pattern not matched" },
    { code: 'BODY_TOO_VAGUE', label: "Body was too sparse or junk-filled for Gemini" },
  ],
  rejection: [
    { code: 'EXPLICIT_DENIAL', label: "Email explicitly states application was denied or rejected" },
    { code: 'MOVE_FORWARD_LANGUAGE', label: "Contains 'move forward with other candidates' or similar" },
    { code: 'CLEAR_REJECTION_SUBJECT', label: "Subject line contains 'rejection', 'denied', or 'not selected'" },
  ],
  more_info_needed: [
    { code: 'REQUESTED_INFO', label: "Email asks for additional information or documents" },
    { code: 'FOLLOW_UP_NEEDED', label: "Email indicates need to follow up with more details" },
    { code: 'ASSESSMENT_PENDING', label: "Email indicates assessment or interview stage needs more from candidate" },
  ],
  job_lead: [
    { code: 'JOB_RECOMMENDATIONS', label: "Contains job recommendations sent to me" },
    { code: 'JOB_ALERT', label: "Job alert from a subscribed job board" },
    { code: 'RECRUITER_OUTREACH', label: "Recruiter outreach about opportunities" },
  ]
}

export function UnrelatedEmails({ onError, onReclassified, onGaugeRefresh }) {
  const [isOpen, setIsOpen] = useState(false)
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reclassifying, setReclassifying] = useState(false)
  const [reclassifyResult, setReclassifyResult] = useState(null)
  // Per-email correction state
  const [correctingEmailId, setCorrectingEmailId] = useState(null)
  const [pendingCategory, setPendingCategory] = useState(null)
  const [selectedReason, setSelectedReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [trashing, setTrashing] = useState(null)

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

  const handleReclassify = async (limit = 20) => {
    setReclassifying(true)
    setError(null)
    setReclassifyResult(null)

    try {
      const response = await reclassifyEmails('unrelated', limit)
      const result = response.data
      setReclassifyResult(result)

      // Reload emails to reflect changes
      await loadEmails()
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to reclassify emails'
      setError(errorMsg)
      if (onError) {
        onError(errorMsg)
      }
      console.error('Error reclassifying emails:', err)
    } finally {
      setReclassifying(false)
    }
  }

  const handleCorrectionSubmit = async (emailId) => {
    if (!selectedReason) return
    setSubmitting(true)
    try {
      await correctEmailClassification(emailId, pendingCategory, selectedReason)
      // Remove the email from local state immediately (optimistic)
      setEmails(prev => prev.filter(e => e.id !== emailId))
      // Clear picker state
      setCorrectingEmailId(null)
      setPendingCategory(null)
      setSelectedReason('')
      // Trigger gauge refresh and App data reload
      if (onGaugeRefresh) onGaugeRefresh()
      if (onReclassified) {
        onReclassified()
      }
    } catch (err) {
      // Local error, don't bubble to full-screen error
      const errorMsg = err.response?.data?.error || err.message || 'Failed to submit correction'
      setError(errorMsg)
      console.error('Error submitting correction:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTrash = async (emailId) => {
    setTrashing(emailId)
    try {
      await trashEmail(emailId)
      // Remove email locally (optimistic update)
      setEmails(prev => prev.filter(e => e.id !== emailId))
      // Update gauge (training signal recorded)
      if (onGaugeRefresh) onGaugeRefresh()
      // Don't call onReclassified for trash — keeps UI at same position
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to trash email'
      setError(errorMsg)
      console.error('Error trashing email:', err)
    } finally {
      setTrashing(null)
    }
  }

  return (
    <div className="border-t bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header with toggle and gauge */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3 flex-wrap">
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
            {/* Reclassify buttons */}
            <div className="flex gap-2 pb-4 border-b">
              <button
                onClick={() => handleReclassify(20)}
                disabled={reclassifying || emails.length === 0}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reclassifying ? 'Reclassifying...' : 'Reclassify (20)'}
              </button>
              <button
                onClick={() => handleReclassify(null)}
                disabled={reclassifying || emails.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reclassifying ? 'Reclassifying...' : 'Reclassify All'}
              </button>
            </div>

            {/* Reclassification results */}
            {reclassifyResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                <p className="font-medium mb-1">{reclassifyResult.message}</p>
                <ul className="text-xs space-y-1 ml-2">
                  <li>✅ Reclassified: {reclassifyResult.reclassified}</li>
                  <li>📝 As Confirmations: {reclassifyResult.application_confirmations}</li>
                  <li>💼 As Job Leads: {reclassifyResult.moved_to_leads}</li>
                  <li>📧 Still Unrelated: {reclassifyResult.still_unrelated}</li>
                  {reclassifyResult.errors && reclassifyResult.errors.length > 0 && (
                    <li className="text-red-600">⚠️ Errors: {reclassifyResult.errors.length}</li>
                  )}
                </ul>
              </div>
            )}

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
                    {formatDate(email.date_received)}
                  </p>
                </div>

                {/* Email body preview */}
                {email.body_excerpt && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {email.body_excerpt.substring(0, 200)}...
                  </div>
                )}

                {/* Per-card correction buttons */}
                <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setCorrectingEmailId(email.id)
                        setPendingCategory('application_confirmation')
                        setSelectedReason('')
                      }}
                      className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 rounded font-medium transition-colors"
                    >
                      → Move to Submitted
                    </button>
                    <button
                      onClick={() => {
                        setCorrectingEmailId(email.id)
                        setPendingCategory('rejection')
                        setSelectedReason('')
                      }}
                      className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded font-medium transition-colors"
                    >
                      → Move to Denied
                    </button>
                    <button
                      onClick={() => {
                        setCorrectingEmailId(email.id)
                        setPendingCategory('more_info_needed')
                        setSelectedReason('')
                      }}
                      className="px-3 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 rounded font-medium transition-colors"
                    >
                      → Move to More Info
                    </button>
                    <button
                      onClick={() => {
                        setCorrectingEmailId(email.id)
                        setPendingCategory('job_lead')
                        setSelectedReason('')
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 rounded font-medium transition-colors"
                    >
                      → Move to Job Leads
                    </button>
                  </div>
                  <button
                    onClick={() => handleTrash(email.id)}
                    disabled={trashing === email.id}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Trash — confirms it's unrelated and trains Gemini"
                  >
                    {trashing === email.id ? '...' : '🗑 Trash'}
                  </button>
                </div>

                {/* Inline reason picker — only for active card */}
                {correctingEmailId === email.id && pendingCategory && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs font-semibold text-yellow-900 mb-2">
                      Why was this misclassified?
                    </p>
                    <div className="flex flex-col gap-1 mb-3">
                      {REASON_CODES[pendingCategory].map(({ code, label }) => (
                        <label key={code} className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`reason-${email.id}`}
                            value={code}
                            checked={selectedReason === code}
                            onChange={() => setSelectedReason(code)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCorrectionSubmit(email.id)}
                        disabled={!selectedReason || submitting}
                        className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? 'Saving...' : 'Confirm & Train Gemini'}
                      </button>
                      <button
                        onClick={() => {
                          setCorrectingEmailId(null)
                          setPendingCategory(null)
                          setSelectedReason('')
                        }}
                        className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
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
