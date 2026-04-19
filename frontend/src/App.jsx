import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { Login } from './Login'
import { getApplications } from './firestore'
import { KanbanBoard } from './KanbanBoard'
import { CardDetail } from './CardDetail'
import { NewApplicationForm } from './NewApplicationForm'
import { Settings } from './Settings'
import { InterviewPrepHistory } from './InterviewPrepHistory'
import { InterviewPrepPage } from './InterviewPrepPage'
import './App.css'

function App() {
  const { user, loading: authLoading, logout } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)
  const [showCardDetail, setShowCardDetail] = useState(false)
  const [showNewAppForm, setShowNewAppForm] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [interviewPrepApp, setInterviewPrepApp] = useState(null)

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  const loadApplications = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const apps = await getApplications(user.uid)
      setApplications(apps)
    } catch (err) {
      setError(err.message)
      console.error('Error loading applications:', err)
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


  const handleNavToInterview = (app) => {
    setInterviewPrepApp(app)
    setShowCardDetail(false)
    setCurrentPage('interview-prep')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  if (error && currentPage === 'dashboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button
            onClick={loadApplications}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', scrollbarGutter: 'stable' }}>
      {/* Header - Slim */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0">
        <div className="w-full px-4 sm:px-8 py-3 sm:py-4">
          {/* Mobile layout */}
          <div className="block sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="text-xl font-black uppercase hover:opacity-80 transition-opacity"
                style={{ letterSpacing: '1px', color: '#3b82f6' }}
              >
                →
              </button>
              <button
                onClick={logout}
                className="text-xs text-slate-400 hover:text-slate-200 uppercase transition-colors"
              >
                Logout
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto justify-center">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`text-xs font-bold uppercase whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  currentPage === 'dashboard'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('interview-prep')}
                className={`text-xs font-bold uppercase whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  currentPage === 'interview-prep'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                Prep
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className={`text-xs font-bold uppercase whitespace-nowrap pb-1 border-b-2 transition-colors ${
                  currentPage === 'settings'
                    ? 'text-blue-400 border-blue-400'
                    : 'text-slate-500 border-transparent'
                }`}
              >
                Settings
              </button>
            </div>
            {currentPage === 'dashboard' && (
              <button
                onClick={() => setShowNewAppForm(true)}
                className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                style={{ borderRadius: '4px' }}
              >
                + New Application
              </button>
            )}
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:flex items-center justify-center relative">
            {/* Logo - Left (absolute) */}
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="absolute left-0 flex items-center gap-2 text-3xl font-black uppercase tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
              style={{ letterSpacing: '2px' }}
            >
              <span style={{ color: '#3b82f6', fontSize: '2.5rem' }}>→</span><span style={{ color: 'white' }}>PIPELINE</span>
            </button>

            {/* Navigation - Center */}
            <div className="flex gap-12 justify-center">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`font-bold uppercase text-sm tracking-widest transition-colors pb-2 border-b-2 ${
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
                className={`font-bold uppercase text-sm tracking-widest transition-colors pb-2 border-b-2 ${
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
                className={`font-bold uppercase text-sm tracking-widest transition-colors pb-2 border-b-2 ${
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
            <div className="absolute right-0 flex items-center gap-4">
              {currentPage === 'dashboard' && (
                <button
                  onClick={() => setShowNewAppForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs transition-colors border-0"
                  style={{ letterSpacing: '0.5px', borderRadius: '0px' }}
                >
                  + New
                </button>
              )}
              <button
                onClick={logout}
                className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs uppercase transition-colors"
                title={user?.email}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 w-full px-4 py-4 sm:px-8 sm:py-8">
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
              {loading ? (
                <div className="flex items-center justify-center min-h-96">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-slate-400">Loading applications...</p>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <KanbanBoard
                    applications={applications}
                    onCardClick={handleCardClick}
                    onApplicationsChange={(apps) => {
                      setApplications(apps)
                      loadApplications()
                    }}
                    onNavToInterview={handleNavToInterview}
                    userId={user?.uid}
                  />
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
          loadApplications()
        }}
        onNavToInterview={handleNavToInterview}
      />

      {/* New Application Form Modal */}
      <NewApplicationForm
        isOpen={showNewAppForm}
        onClose={() => setShowNewAppForm(false)}
        onSuccess={(newApp) => {
          setApplications(prev => [newApp, ...prev])
        }}
      />
    </div>
  )
}

export default App
