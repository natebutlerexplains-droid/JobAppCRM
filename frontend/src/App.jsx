import { useState, useEffect } from 'react'
import { getApplications, getStats, getStageSuggestions, getUnlinkedEmails, getFilterOptions } from './api'
import { KanbanBoard } from './KanbanBoard'
import { CardDetail } from './CardDetail'
import { NewApplicationForm } from './NewApplicationForm'
import { UnlinkedEmailsTray } from './UnlinkedEmailsTray'
import { UnrelatedEmails } from './UnrelatedEmails'
import { JobLeads } from './JobLeads'
import { Settings } from './Settings'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [unlinkedEmails, setUnlinkedEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showCardDetail, setShowCardDetail] = useState(false)
  const [showNewAppForm, setShowNewAppForm] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard') // 'dashboard' or 'settings'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [emailTypeFilter, setEmailTypeFilter] = useState('')
  const [filterOptions, setFilterOptions] = useState({ statuses: [], email_types: [] })

  useEffect(() => {
    loadData()
  }, [])

  // Debounced search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFilteredApplications()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, emailTypeFilter])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [appsRes, statsRes, suggestionsRes, emailsRes, optionsRes] = await Promise.all([
        getApplications(),
        getStats(),
        getStageSuggestions(),
        getUnlinkedEmails(),
        getFilterOptions(),
      ])

      setApplications(appsRes.data)
      setStats(statsRes.data)
      setSuggestions(suggestionsRes.data)
      setUnlinkedEmails(emailsRes.data)
      setFilterOptions(optionsRes.data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFilteredApplications = async () => {
    try {
      const res = await getApplications(searchTerm, statusFilter, emailTypeFilter)
      setApplications(res.data)
    } catch (err) {
      console.error('Error loading filtered applications:', err)
    }
  }

  const handleCardClick = (app) => {
    setSelectedApp(app)
    setShowCardDetail(true)
  }

  const handleApplicationsChange = (updatedApps) => {
    setApplications(updatedApps)
  }

  if (loading && currentPage === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading Job CRM...</p>
        </div>
      </div>
    )
  }

  if (error && currentPage === 'dashboard') {
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-foreground">Job Application CRM</h1>
            {currentPage === 'dashboard' && (
              <button
                onClick={() => setShowNewAppForm(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity font-medium"
              >
                + New Application
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-4 border-t pt-3">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-3 py-2 rounded font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`px-3 py-2 rounded font-medium transition-colors ${
                currentPage === 'settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background">
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {currentPage === 'settings' && <Settings />}
          {currentPage === 'dashboard' && (
            <>

        {/* Search and Filters */}
        <div className="bg-card border rounded p-4 mb-6">
          <div className="space-y-4">
            {/* Search Box */}
            <div>
              <input
                type="text"
                placeholder="Search by company, job title, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                {filterOptions.statuses?.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* Email Type Filter */}
              <select
                value={emailTypeFilter}
                onChange={(e) => setEmailTypeFilter(e.target.value)}
                className="px-3 py-2 border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Email Types</option>
                {filterOptions.email_types?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              {(searchTerm || statusFilter || emailTypeFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                    setEmailTypeFilter('')
                  }}
                  className="px-3 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

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

            {/* Placeholder for Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-8 bg-card border rounded">
                <h2 className="font-bold mb-4">Stage Suggestions ({suggestions.length})</h2>
                <div className="text-muted-foreground">
                  <p>Stage Suggestions Component</p>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Job Leads Section */}
        {currentPage === 'dashboard' && (
          <JobLeads
            onError={(err) => {
              setError(err)
            }}
          />
        )}

        {/* Unrelated Emails Section */}
        {currentPage === 'dashboard' && (
          <UnrelatedEmails
            onError={(err) => {
              setError(err)
            }}
          />
        )}

        {/* Unlinked Emails Tray */}
        {currentPage === 'dashboard' && (
        <div className="mt-auto">
          <UnlinkedEmailsTray
            emails={unlinkedEmails}
            applications={applications}
            onEmailLinked={(emailId, appId) => {
              // Remove email from unlinked list
              setUnlinkedEmails(prev => prev.filter(e => e.id !== emailId))
              // Reload data to update app's email count
              loadData()
            }}
            onError={(err) => {
              setError(err)
            }}
            onProcessed={() => {
              // Refresh unlinked emails and stats after processing
              loadData()
            }}
          />
        </div>
        )}
      </main>

      {/* Card Detail Panel */}
      <CardDetail
        application={selectedApp}
        isOpen={showCardDetail}
        onClose={() => {
          setShowCardDetail(false)
          setSelectedApp(null)
        }}
      />

      {/* New Application Form Modal */}
      <NewApplicationForm
        isOpen={showNewAppForm}
        onClose={() => setShowNewAppForm(false)}
        onSuccess={(newApp) => {
          // Add new app to the beginning of the list
          setApplications(prev => [newApp, ...prev])
          // Reload stats
          loadData()
        }}
      />
    </div>
  )
}

export default App
