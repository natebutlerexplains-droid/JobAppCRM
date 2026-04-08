import { useState, useEffect } from 'react'
import { getApplications, getStats, getStageSuggestions, getUnlinkedEmails } from './api'
import { KanbanBoard } from './KanbanBoard'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [unlinkedEmails, setUnlinkedEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [appsRes, statsRes, suggestionsRes, emailsRes] = await Promise.all([
        getApplications(),
        getStats(),
        getStageSuggestions(),
        getUnlinkedEmails(),
      ])

      setApplications(appsRes.data)
      setStats(statsRes.data)
      setSuggestions(suggestionsRes.data)
      setUnlinkedEmails(emailsRes.data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (app) => {
    // TODO: Open CardDetail panel
    console.log('Card clicked:', app)
  }

  const handleApplicationsChange = (updatedApps) => {
    setApplications(updatedApps)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading Job CRM...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <button
            onClick={loadData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-foreground">Job Application CRM</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-card border rounded p-4">
            <div className="text-sm text-muted-foreground">Submitted</div>
            <div className="text-2xl font-bold">{stats.Submitted || 0}</div>
          </div>
          <div className="bg-card border rounded p-4">
            <div className="text-sm text-muted-foreground">More Info</div>
            <div className="text-2xl font-bold">{stats['More Info Required'] || 0}</div>
          </div>
          <div className="bg-card border rounded p-4">
            <div className="text-sm text-muted-foreground">Interview</div>
            <div className="text-2xl font-bold">{stats['Interview Started'] || 0}</div>
          </div>
          <div className="bg-card border rounded p-4">
            <div className="text-sm text-muted-foreground">Denied</div>
            <div className="text-2xl font-bold">{stats.Denied || 0}</div>
          </div>
          <div className="bg-card border rounded p-4">
            <div className="text-sm text-muted-foreground">Offered</div>
            <div className="text-2xl font-bold">{stats.Offered || 0}</div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="mb-8">
          <KanbanBoard
            applications={applications}
            suggestions={suggestions}
            onCardClick={handleCardClick}
            onApplicationsChange={handleApplicationsChange}
          />
        </div>

        {/* Placeholder for Unlinked Emails */}
        {unlinkedEmails.length > 0 && (
          <div className="mb-8 p-8 bg-card border rounded">
            <h2 className="font-bold mb-4">Unlinked Emails ({unlinkedEmails.length})</h2>
            <div className="text-muted-foreground">
              <p>Unlinked Emails Tray Component</p>
            </div>
          </div>
        )}

        {/* Placeholder for Suggestions */}
        {suggestions.length > 0 && (
          <div className="p-8 bg-card border rounded">
            <h2 className="font-bold mb-4">Stage Suggestions ({suggestions.length})</h2>
            <div className="text-muted-foreground">
              <p>Stage Suggestions Component</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
