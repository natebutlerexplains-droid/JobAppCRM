import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { researchCompanyPrep, generateInterviewQuestions } from './api'

function ResearchTile({ title, icon, content, loading, isEmpty, isEditing, fieldValue, onFieldChange, onEdit, isFromFallback, isError }) {
  const [expanded, setExpanded] = useState(true)

  if (isEmpty && !isEditing) {
    return (
      <div className={`border p-4 ${isError ? 'bg-red-900/20 border-red-700' : 'bg-slate-800/50 border-slate-700'}`}>
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className={`text-xs font-bold ${isError ? 'text-red-400' : 'text-slate-400'}`}>
              {icon} {title}
            </p>
            <p className={`text-xs mt-1 ${isError ? 'text-red-400' : 'text-slate-500'}`}>
              {isError ? 'Research failed - API error' : 'No data available'}
            </p>
          </div>
          <span className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">ℹ️</span>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="bg-slate-800/50 border border-slate-600 p-4">
        <label className="block text-xs font-bold text-slate-300 mb-2">
          {icon} {title}
        </label>
        <textarea
          value={fieldValue}
          onChange={onFieldChange}
          placeholder={`Enter ${title.toLowerCase()}...`}
          rows="3"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white text-sm rounded"
          style={{ borderRadius: '0px' }}
        />
        <button
          onClick={onEdit}
          className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-xs transition-colors"
          style={{ borderRadius: '0px' }}
        >
          Save
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-between items-center p-4 hover:bg-slate-800/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-bold text-white text-sm uppercase" style={{ letterSpacing: '0.5px' }}>
            {title}
          </span>
          {isFromFallback && (
            <span className="text-xs text-purple-400 font-medium">🧠 from knowledge base</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-slate-700 p-4 text-slate-300 text-sm">
          {loading ? (
            <p className="text-slate-500 italic">Loading...</p>
          ) : (
            content
          )}
        </div>
      )}
    </div>
  )
}

export function InterviewPrepPage({ application, onBack }) {
  const [prep, setPrep] = useState(null)
  const [companyWebsite, setCompanyWebsite] = useState(application?.company_website || '')
  const [researching, setResearching] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState({})

  const handleResearch = async () => {
    setResearching(true)
    setError(null)
    try {
      const res = await researchCompanyPrep(application.id, { company_website: companyWebsite || undefined })
      // Parse company_research if it's a string
      const prepData = { ...res.data }
      if (typeof prepData.company_research === 'string') {
        prepData.company_research = JSON.parse(prepData.company_research)
      }
      setPrep(prepData)
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
    } catch (err) {
      setError(err.message || 'Failed to generate questions')
    } finally {
      setGeneratingQuestions(false)
    }
  }

  const companyResearch = prep?.company_research
  const interviewQuestions = prep?.interview_questions ? (
    typeof prep.interview_questions === 'string'
      ? JSON.parse(prep.interview_questions)
      : prep.interview_questions
  ) : null
  const questionsToAsk = prep?.questions_to_ask ? (
    typeof prep.questions_to_ask === 'string'
      ? JSON.parse(prep.questions_to_ask)
      : prep.questions_to_ask
  ) : null

  // Group interview questions by category
  const questionsByCategory = interviewQuestions ? (
    Array.isArray(interviewQuestions)
      ? interviewQuestions.reduce((acc, q) => {
          const cat = q.category || 'other'
          if (!acc[cat]) acc[cat] = []
          acc[cat].push(q)
          return acc
        }, {})
      : {}
  ) : {}

  const handleCopyResearch = () => {
    const researchText = `${application.company_name} - ${application.job_title}

Company Overview:
${companyResearch?.company_overview || 'N/A'}

Key Products & Services:
${Array.isArray(companyResearch?.key_products) ? companyResearch.key_products.join('\n') : companyResearch?.key_products || 'N/A'}

Company Culture:
${companyResearch?.company_culture || 'N/A'}

Organization Structure:
${companyResearch?.org_structure || 'N/A'}

CEO / Leadership:
${companyResearch?.ceo_info || 'N/A'}

Recent News:
${Array.isArray(companyResearch?.recent_news) ? companyResearch.recent_news.join('\n') : companyResearch?.recent_news || 'N/A'}

Industry Relevance:
${companyResearch?.industry_relevance || 'N/A'}

Hiring Focus:
${companyResearch?.hiring_focus || 'N/A'}`

    navigator.clipboard.writeText(researchText)
    alert('Research copied to clipboard!')
  }

  // Check which fields are from fallback
  const fallbackFields = companyResearch?.fallback_fields || []
  const isFromFallback = (fieldName) => fallbackFields.includes(fieldName)

  const researchTiles = [
    {
      title: 'Company Overview',
      icon: '🏢',
      fieldKey: 'company_overview',
      content: companyResearch?.company_overview && (
        <p>{companyResearch.company_overview}</p>
      )
    },
    {
      title: 'Key Products & Services',
      icon: '📦',
      fieldKey: 'key_products',
      content: companyResearch?.key_products && (
        Array.isArray(companyResearch.key_products) ? (
          <ul className="space-y-2 ml-4">
            {companyResearch.key_products.map((item, i) => (
              <li key={i} className="list-disc text-slate-300">
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
      fieldKey: 'company_culture',
      content: companyResearch?.company_culture && (
        <p>{companyResearch.company_culture}</p>
      )
    },
    {
      title: 'Organization Structure',
      icon: '🏛️',
      fieldKey: 'org_structure',
      content: companyResearch?.org_structure && (
        <p>{companyResearch.org_structure}</p>
      )
    },
    {
      title: 'CEO / Leadership',
      icon: '👔',
      fieldKey: 'ceo_info',
      content: companyResearch?.ceo_info && (
        <p>{companyResearch.ceo_info}</p>
      )
    },
    {
      title: 'Recent News',
      icon: '📰',
      fieldKey: 'recent_news',
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
      fieldKey: 'industry_relevance',
      content: companyResearch?.industry_relevance && (
        <p>{companyResearch.industry_relevance}</p>
      )
    },
    {
      title: 'Hiring Focus',
      icon: '🎖️',
      fieldKey: 'hiring_focus',
      content: companyResearch?.hiring_focus && (
        <p>{companyResearch.hiring_focus}</p>
      )
    }
  ]

  return (
    <div className="w-full space-y-6">
      {/* Header with back button */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
            Interview Prep
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">{application.company_name} • {application.job_title}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors"
          style={{ borderRadius: '0px' }}
        >
          ← Back
        </button>
      </div>

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
          {/* Error State Banner */}
          {companyResearch?.data_source === 'error' && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 text-sm rounded">
              <p className="font-bold mb-1">⚠️ Research Failed - API Quota Exceeded</p>
              <p>The Gemini API daily quota was exceeded. Please try again tomorrow when the quota resets. You can safely click "🔍 Research Company" to retry after the reset.</p>
              {prep?.updated_at && (
                <p className="text-xs text-red-400 mt-2">
                  Last attempted: {new Date(prep.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
                Company Research
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Last updated: {new Date(prep.updated_at).toLocaleString()}
              </p>
              {companyResearch.fallback_fields && companyResearch.fallback_fields.length > 0 && (
                <p className="text-xs text-purple-400 mt-1">
                  🧠 Some info from Gemini knowledge base: {companyResearch.fallback_fields.map(f => f.replace(/_/g, ' ')).join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyResearch}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-xs transition-colors"
                style={{ borderRadius: '0px' }}
              >
                📋 Copy
              </button>
              {!interviewQuestions && (
                <button
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderRadius: '0px' }}
                >
                  {generatingQuestions ? '⟳ Generating...' : 'Generate Questions'}
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 font-bold uppercase text-sm transition-colors ${
                isEditing
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
              style={{ borderRadius: '0px' }}
            >
              {isEditing ? '✓ Done Editing' : '✏️ Edit Missing Fields'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {researchTiles.map((tile, i) => {
              const isEmpty = !tile.content
              return (
                <ResearchTile
                  key={i}
                  title={tile.title}
                  icon={tile.icon}
                  content={tile.content}
                  loading={researching}
                  isEmpty={isEmpty}
                  isEditing={isEditing && isEmpty}
                  fieldValue={editedFields[tile.fieldKey] || ''}
                  onFieldChange={e => setEditedFields({...editedFields, [tile.fieldKey]: e.target.value})}
                  onEdit={() => console.log(`Saved ${tile.fieldKey}:`, editedFields[tile.fieldKey])}
                  isFromFallback={isFromFallback(tile.fieldKey)}
                  isError={companyResearch?.data_source === 'error'}
                />
              )
            })}
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
    </div>
  )
}
