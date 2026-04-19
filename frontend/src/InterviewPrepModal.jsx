import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'

// Expandable tile component
function ResearchTile({ title, icon, content, loading }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-slate-700 bg-slate-800/50 overflow-hidden">
      <button
        onClick={() => !loading && setExpanded(!expanded)}
        disabled={loading}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          {icon} {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && !loading && content && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/50 text-slate-300 text-sm space-y-2">
          {content}
        </div>
      )}
      {loading && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/50 text-slate-500 text-sm">
          Loading...
        </div>
      )}
    </div>
  )
}

export function InterviewPrepModal({ application, isOpen, onClose }) {
  const [prep, setPrep] = useState(null)
  const [companyWebsite, setCompanyWebsite] = useState(application?.company_website || '')
  const [loading, setLoading] = useState(false)
  const [researching, setResearching] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [error, setError] = useState(null)

  // Initialize with application data
  useEffect(() => {
    if (isOpen && application?.company_website) {
      setCompanyWebsite(application.company_website)
    }
  }, [isOpen, application?.company_website])

  const handleResearch = async () => {
    setResearching(true)
    setError(null)
    try {
      const res = await researchCompanyPrep(application.id, { company_website: companyWebsite || undefined })
      setPrep(res.data)
    } catch (err) {
      setError(err.message || 'Failed to research company')
    } finally {
      setResearching(false)
    }
  }

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true)
    setError(null)
    try {
      const res = await generateInterviewQuestions(application.id)
      setPrep(prev => ({ ...prev, ...res.data }))
      // Save session
      if (prep?.company_research) {
        saveInterviewPrepSession(application.id, application.company_name, application.job_title, prep.company_research, res.data.questions)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate questions')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  if (!isOpen || !application) return null

  const companyResearch = prep?.company_research
  const interviewQuestions = prep?.interview_questions
  const questionsToAsk = prep?.questions_to_ask

  const researchTiles = [
    {
      title: 'Company Overview',
      icon: '🏢',
      content: companyResearch?.company_overview && (
        <p>{companyResearch.company_overview}</p>
      )
    },
    {
      title: 'Key Products & Services',
      icon: '📦',
      content: companyResearch?.key_products && (
        Array.isArray(companyResearch.key_products) ? (
          <ul className="space-y-1">
            {companyResearch.key_products.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-400">→</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p>{companyResearch.key_products}</p>
        )
      )
    },
    {
      title: 'Company Culture',
      icon: '🎯',
      content: companyResearch?.company_culture && (
        <p>{companyResearch.company_culture}</p>
      )
    },
    {
      title: 'Organization Structure',
      icon: '🏛️',
      content: companyResearch?.org_structure && (
        <p>{companyResearch.org_structure}</p>
      )
    },
    {
      title: 'CEO / Leadership',
      icon: '👔',
      content: companyResearch?.ceo_info && (
        <p>{companyResearch.ceo_info}</p>
      )
    },
    {
      title: 'Recent News',
      icon: '📰',
      content: companyResearch?.recent_news && (
        Array.isArray(companyResearch.recent_news) ? (
          <ul className="space-y-2">
            {companyResearch.recent_news.map((news, i) => (
              <li key={i} className="text-sm">{news}</li>
            ))}
          </ul>
        ) : (
          <p>{companyResearch.recent_news}</p>
        )
      )
    },
    {
      title: 'Industry Relevance',
      icon: '📊',
      content: companyResearch?.industry_relevance && (
        <p>{companyResearch.industry_relevance}</p>
      )
    },
    {
      title: 'Hiring Focus',
      icon: '🎖️',
      content: companyResearch?.hiring_focus && (
        <p>{companyResearch.hiring_focus}</p>
      )
    }
  ]

  const questionsByCategory = interviewQuestions && Array.isArray(interviewQuestions)
    ? interviewQuestions.reduce((acc, q) => {
        if (!acc[q.category]) acc[q.category] = []
        acc[q.category].push(q)
        return acc
      }, {})
    : {}

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 max-w-3xl w-full my-8" style={{ borderRadius: '0px' }}>
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-start z-10">
            <div>
              <h2 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
                Interview Prep
              </h2>
              <p className="text-slate-400 text-sm mt-1 font-medium">{application.company_name} • {application.job_title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 text-sm">
                {error}
              </div>
            )}

            {/* URL Input */}
            <div className="bg-slate-800/50 border border-slate-700 p-4">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase" style={{ letterSpacing: '0.5px' }}>
                Company Website (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={companyWebsite}
                  onChange={e => setCompanyWebsite(e.target.value)}
                  placeholder="google.com or https://example.com"
                  disabled={researching}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                />
                <button
                  onClick={handleResearch}
                  disabled={researching}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '0px' }}
                >
                  {researching ? '...' : '🔍'}
                </button>
              </div>
              {companyResearch && (
                <p className="text-xs text-slate-500 mt-2">
                  {companyResearch.web_crawled
                    ? '🤖 Researched via Gemini + Website Content'
                    : '🤖 Researched via Gemini Knowledge'}
                </p>
              )}
            </div>

            {/* Research Section */}
            {companyResearch ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
                    Company Research
                  </h3>
                  {!interviewQuestions && (
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={generatingQuestions}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: '0px' }}
                    >
                      {generatingQuestions ? 'Generating...' : 'Generate Questions'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {researchTiles.map((tile, i) => (
                    <ResearchTile
                      key={i}
                      title={tile.title}
                      icon={tile.icon}
                      content={tile.content}
                      loading={researching}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 p-8 text-center">
                <p className="text-slate-400 mb-4">No research data yet. Click the research button above to get started.</p>
                <button
                  onClick={handleResearch}
                  disabled={researching}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '0px' }}
                >
                  {researching ? 'Researching...' : '🔍 Research Company'}
                </button>
              </div>
            )}

            {/* Interview Questions Section */}
            {interviewQuestions && (
              <div className="space-y-3">
                <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
                  Interview Questions
                </h3>

                <div className="space-y-3">
                  {Object.entries(questionsByCategory).map(([category, questions]) => (
                    <ResearchTile
                      key={category}
                      title={`${category.charAt(0).toUpperCase() + category.slice(1)} (${questions.length})`}
                      icon={category === 'behavioral' ? '💭' : category === 'technical' ? '💻' : '🤔'}
                      content={
                        <div className="space-y-3">
                          {questions.map((q, i) => (
                            <div key={i} className="pb-3 border-b border-slate-700 last:border-0">
                              <p className="font-medium text-white mb-1 text-sm">{q.question}</p>
                              {q.answer_hint && (
                                <p className="text-xs text-blue-400">💡 {q.answer_hint}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      }
                    />
                  ))}
                </div>

                {questionsToAsk && Array.isArray(questionsToAsk) && questionsToAsk.length > 0 && (
                  <ResearchTile
                    title="Questions to Ask Them"
                    icon="🤔"
                    content={
                      <ul className="space-y-2">
                        {questionsToAsk.map((q, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-blue-400 font-bold">{i + 1}.</span>
                            {q}
                          </li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
              style={{ borderRadius: '0px' }}
            >
              ✓ Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
