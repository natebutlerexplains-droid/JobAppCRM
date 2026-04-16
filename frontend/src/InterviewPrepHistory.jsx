import { useState } from 'react'
import { getSavedInterviewPrepSessions, deleteInterviewPrepSession } from './interviewPrepStorage'
import { X } from 'lucide-react'

export function InterviewPrepHistory() {
  const [sessions, setSessions] = useState(getSavedInterviewPrepSessions())
  const [selectedSession, setSelectedSession] = useState(null)

  const handleDelete = (appId) => {
    if (window.confirm('Delete this interview prep session?')) {
      deleteInterviewPrepSession(appId)
      setSessions(getSavedInterviewPrepSessions())
      if (selectedSession?.appId === appId) {
        setSelectedSession(null)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black uppercase text-white mb-4" style={{ letterSpacing: '1px' }}>
          Interview Prep History
        </h2>
        <p className="text-slate-400 text-sm">View all interview prep sessions you've saved</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700 p-8 text-center">
          <p className="text-slate-400">No interview prep sessions saved yet. Click "Interview Prep" on a card to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Sessions List */}
          <div className="space-y-3">
            <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Sessions ({sessions.length})</h3>
            <div className="space-y-2">
              {sessions.map(session => (
                <div
                  key={session.appId}
                  onClick={() => setSelectedSession(session)}
                  className={`p-4 border cursor-pointer transition-colors ${
                    selectedSession?.appId === session.appId
                      ? 'bg-blue-900/20 border-blue-500'
                      : 'bg-slate-800/30 border-slate-700 hover:bg-slate-800/50'
                  }`}
                  style={{ borderRadius: '0px' }}
                >
                  <p className="font-bold text-white text-sm">{session.companyName}</p>
                  <p className="text-slate-400 text-xs">{session.jobTitle}</p>
                  <p className="text-slate-500 text-xs mt-2">
                    {new Date(session.savedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Session Details */}
          <div>
            {selectedSession ? (
              <div className="space-y-6 sticky top-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase" style={{ letterSpacing: '0.5px' }}>
                      {selectedSession.companyName}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{selectedSession.jobTitle}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedSession.appId)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-2"
                    title="Delete session"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedSession.research && (
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 border border-slate-700 p-4">
                      <h4 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
                        Company Overview
                      </h4>
                      <p className="text-slate-300 text-sm">{selectedSession.research?.company_research?.company_overview}</p>
                    </div>

                    {selectedSession.research?.company_research?.key_products && (
                      <div className="bg-slate-800/50 border border-slate-700 p-4">
                        <h4 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
                          Key Products & Services
                        </h4>
                        <ul className="space-y-2">
                          {selectedSession.research.company_research.key_products.map((product, i) => (
                            <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                              <span className="text-blue-400 font-bold">→</span>
                              {product}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-slate-800/50 border border-slate-700 p-4">
                      <h4 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
                        Company Culture
                      </h4>
                      <p className="text-slate-300 text-sm">{selectedSession.research?.company_research?.company_culture}</p>
                    </div>
                  </div>
                )}

                {selectedSession.questions && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
                        Interview Questions
                      </h4>
                      <div className="space-y-2">
                        {selectedSession.questions.prep_questions?.interview_questions?.map((q, i) => (
                          <div key={i} className="bg-slate-800/30 border border-slate-700 p-3 text-sm">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <p className="text-white">{q.question}</p>
                              <span className="text-xs font-bold uppercase text-slate-500">{q.difficulty}</span>
                            </div>
                            <p className="text-xs text-slate-500 uppercase">{q.category}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedSession.questions.prep_questions?.questions_to_ask && (
                      <div>
                        <h4 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
                          Questions to Ask
                        </h4>
                        <div className="space-y-2">
                          {selectedSession.questions.prep_questions.questions_to_ask.map((q, i) => (
                            <div key={i} className="flex gap-2 text-slate-300 text-sm">
                              <span className="text-blue-400 font-bold">•</span>
                              {q}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700 p-8 text-center h-full flex items-center justify-center">
                <p className="text-slate-400">Select a session to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
