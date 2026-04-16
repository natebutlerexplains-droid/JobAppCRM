import { useState, useEffect } from 'react'
import { getApplications, getStats, getStageSuggestions } from './api'
import { KanbanBoard } from './KanbanBoard'
import { CardDetail } from './CardDetail'
import { NewApplicationForm } from './NewApplicationForm'
import { Settings } from './Settings'
import './App.css'

function App() {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showCardDetail, setShowCardDetail] = useState(false)
  const [showNewAppForm, setShowNewAppForm] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard') // 'dashboard' or 'settings'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [appsRes, statsRes, suggestionsRes] = await Promise.all([
        getApplications(),
        getStats(),
        getStageSuggestions(),
      ])

      setApplications(appsRes.data)
      setStats(statsRes.data)
      setSuggestions(suggestionsRes.data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                Job CRM
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track your applications pipeline</p>
            </div>
            {currentPage === 'dashboard' && (
              <button
                onClick={() => setShowNewAppForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                ✨ New Application
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentPage === 'settings'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          {currentPage === 'settings' && <Settings />}
          {currentPage === 'dashboard' && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-5 gap-4 mb-10">
                {[
                  { label: 'Submitted', value: stats.Submitted || 0, color: 'from-blue-500 to-blue-600' },
                  { label: 'More Info', value: stats['More Info Required'] || 0, color: 'from-amber-500 to-amber-600' },
                  { label: 'Interview', value: stats['Interview Started'] || 0, color: 'from-purple-500 to-purple-600' },
                  { label: 'Denied', value: stats.Denied || 0, color: 'from-red-500 to-red-600' },
                  { label: 'Offered', value: stats.Offered || 0, color: 'from-emerald-500 to-emerald-600' },
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-gradient-to-br ${stat.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-200`}>
                    <div className="text-sm font-medium opacity-90">{stat.label}</div>
                    <div className="text-4xl font-bold mt-3">{stat.value}</div>
                  </div>
                ))}
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
