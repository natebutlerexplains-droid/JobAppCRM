import { useState, useEffect } from 'react'
import { getPrepHistory, formatDate } from './api'

export function PrepHistory({ onSelectPrep }) {
  const [preps, setPreps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPrepHistory()
  }, [])

  const loadPrepHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getPrepHistory()
      setPreps(res.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load prep history')
      console.error('Error loading prep history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading interview prep history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-foreground">Interview Prep History</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all your interview preparation sessions</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded mb-6">
            {error}
          </div>
        )}

        {preps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No interview prep sessions yet.</p>
            <p className="text-muted-foreground text-sm mt-2">Start by clicking "Prep →" on a kanban card to begin interview preparation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Position</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Date Started</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Quiz Count</th>
                  <th className="text-center px-4 py-3 font-semibold text-foreground">Avg Score</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {preps.map(prep => (
                  <tr key={prep.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{prep.company_name}</td>
                    <td className="px-4 py-3 text-foreground">{prep.job_title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(prep.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">
                      {prep.quiz_count || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {prep.quiz_average ? (
                        <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                          prep.quiz_average >= 7
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {prep.quiz_average}/10
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectPrep(prep.application_id)}
                        className="px-3 py-1 text-sm font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                      >
                        Resume Prep →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
