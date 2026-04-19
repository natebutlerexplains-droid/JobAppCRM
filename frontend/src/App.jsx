import { useState, useEffect } from 'react'
import { getApplications, getStats, getStageSuggestions } from './api'
import { KanbanBoard } from './KanbanBoard'
import { CardDetail } from './CardDetail'
import { NewApplicationForm } from './NewApplicationForm'
import { Settings } from './Settings'
import { InterviewPrepHistory } from './InterviewPrepHistory'
import { InterviewPrepPage } from './InterviewPrepPage'
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
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [interviewPrepApp, setInterviewPrepApp] = useState(null)

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
    // Recalculate stats after changes
    const newStats = {}
    updatedApps.forEach(app => {
      newStats[app.status] = (newStats[app.status] || 0) + 1
    })
    setStats(newStats)
  }

  const handleNavToInterview = (app) => {
    setInterviewPrepApp(app)
    setShowCardDetail(false)
    setCurrentPage('interview-prep')
  }

  if (loading && currentPage === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading Job CRM...</p>
        </div>
      </div>
    )
  }

  if (error && currentPage === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-wide transition-colors"
            style={{ borderRadius: '0px' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', scrollbarGutter: 'stable' }}>
      {/* Header - Slim */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0">
        <div className="w-full px-8 py-4">
          <div className="flex items-center justify-center relative">
            {/* Logo - Left (absolute) */}
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="absolute left-0 text-3xl font-black uppercase tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
              style={{ letterSpacing: '2px' }}
            >
              <span style={{ color: '#3b82f6' }}>→</span><span style={{ color: 'white' }}>PIPELINE</span>
            </button>

            {/* Navigation - Center */}
            <div className="flex gap-8">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`font-bold uppercase text-xs tracking-widest transition-colors pb-2 border-b-2 ${
                  currentPage === 'dashboard'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
                style={{ letterSpacing: '0.5px' }}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('interview-prep')}
                className={`font-bold uppercase text-xs tracking-widest transition-colors pb-2 border-b-2 ${
                  currentPage === 'interview-prep'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
                style={{ letterSpacing: '0.5px' }}
              >
                Interview Prep
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className={`font-bold uppercase text-xs tracking-widest transition-colors pb-2 border-b-2 ${
                  currentPage === 'settings'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
                style={{ letterSpacing: '0.5px' }}
              >
                Settings
              </button>
            </div>

            {/* Button - Right (absolute) */}
            {currentPage === 'dashboard' && (
              <button
                onClick={() => setShowNewAppForm(true)}
                className="absolute right-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs transition-colors border-0"
                style={{ letterSpacing: '0.5px', borderRadius: '0px' }}
              >
                + New
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 w-full px-8 py-8">
          {currentPage === 'settings' && <Settings />}
          {currentPage === 'interview-prep' && (
            <>
              {interviewPrepApp ? (
                <InterviewPrepPage
                  application={interviewPrepApp}
                  onBack={() => {
                    setInterviewPrepApp(null)
                  }}
                />
              ) : (
                <InterviewPrepHistory onSelectApp={handleNavToInterview} />
              )}
            </>
          )}
          {currentPage === 'dashboard' && (
            <>
              {/* Kanban Board */}
              <div className="mb-8">
                <KanbanBoard
                  applications={applications}
                  suggestions={suggestions}
                  onCardClick={handleCardClick}
                  onRefresh={loadData}
                  onNavToInterview={handleNavToInterview}
                />
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-8 bg-slate-800/50 border border-slate-700">
                  <h2 className="font-bold text-white mb-4 uppercase tracking-wide">Stage Suggestions ({suggestions.length})</h2>
                  <div className="text-slate-400">
                    <p>Pending suggestions component</p>
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
        onSave={() => {
          loadData()
        }}
        onNavToInterview={handleNavToInterview}
      />

      {/* New Application Form Modal */}
      <NewApplicationForm
        isOpen={showNewAppForm}
        onClose={() => setShowNewAppForm(false)}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev])
          loadData()
        }}
      />
    </div>
  )
}

export default App
