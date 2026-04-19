import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useAuth } from './AuthContext'
import { getInterviewPrep, saveInterviewPrep } from './firestore'
import { parseMarkdownResearch } from './utils/markdownParser'
import { formatMarkdownText } from './utils/markdownFormatter.jsx'
import { PromptTemplateModal } from './components/PromptTemplateModal'

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
    <div
      className="bg-slate-800/50 border border-slate-700 transition-all duration-200 hover:shadow-lg"
      style={{
        borderRadius: '8px',
        boxShadow: expanded
          ? '0 10px 25px rgba(0, 0, 0, 0.4), inset 0 -2px 4px rgba(255, 255, 255, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 -1px 2px rgba(255, 255, 255, 0.05)'
      }}
    >
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
  const { user } = useAuth()
  const [prep, setPrep] = useState(null)
  const [companyWebsite, setCompanyWebsite] = useState(application?.company_website || '')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedFields, setEditedFields] = useState({})
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Load existing prep data when page opens
  useEffect(() => {
    const loadPrepData = async () => {
      if (!user) return
      try {
        const prepData = await getInterviewPrep(user.uid, application.id)
        if (prepData) {
          if (typeof prepData.company_research === 'string') {
            prepData.company_research = JSON.parse(prepData.company_research)
          }
          setPrep(prepData)
        }
      } catch (err) {
        // No prep data exists yet, that's ok
      }
    }
    loadPrepData()
  }, [user, application.id])

  // Auto-save when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges || Object.keys(editedFields).length === 0) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to auto-save after 1 second
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveChanges()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, editedFields])

  const handleSaveChanges = async () => {
    if (!user || Object.keys(editedFields).length === 0) return

    setIsSaving(true)
    try {
      const companyResearch = typeof prep?.company_research === 'string'
        ? JSON.parse(prep.company_research)
        : prep?.company_research || {}

      const updatedResearch = {
        ...companyResearch,
        ...editedFields
      }

      await saveInterviewPrep(user.uid, application.id, {
        company_research: updatedResearch
      })

      setPrep(prev => ({ ...prev, company_research: updatedResearch }))
      setEditedFields({})
      setHasUnsavedChanges(false)
      setError(null)
    } catch (err) {
      setError(`Failed to save changes: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !file.name.endsWith('.md')) {
      setError('Please upload a .md file')
      return
    }

    setUploadLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const parsed = parseMarkdownResearch(text)

      // Store pending upload but don't save yet
      setPendingUpload(parsed)
      setError(null)
    } catch (err) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploadLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleConfirmUpload = async () => {
    if (!user || !pendingUpload) return

    setIsSaving(true)
    try {
      await saveInterviewPrep(user.uid, application.id, {
        company_research: pendingUpload
      })

      setPrep(prev => ({ ...prev, company_research: pendingUpload }))
      setPendingUpload(null)
      setEditedFields({})
      setHasUnsavedChanges(false)
      setError(null)

      // Scroll to research section
      setTimeout(() => {
        document.querySelector('[data-research-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err) {
      setError(`Failed to save upload: ${err.message}`)
    } finally {
      setIsSaving(false)
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
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.company_overview)}</div>
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
              <li key={i} className="list-disc text-slate-300 text-sm">
                {formatMarkdownText(item)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.key_products)}</div>
        )
      )
    },
    {
      title: 'Company Culture',
      icon: '🎯',
      fieldKey: 'company_culture',
      content: companyResearch?.company_culture && (
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.company_culture)}</div>
      )
    },
    {
      title: 'Organization Structure',
      icon: '🏛️',
      fieldKey: 'org_structure',
      content: companyResearch?.org_structure && (
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.org_structure)}</div>
      )
    },
    {
      title: 'CEO / Leadership',
      icon: '👔',
      fieldKey: 'ceo_info',
      content: companyResearch?.ceo_info && (
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.ceo_info)}</div>
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
              <li key={i} className="text-sm list-disc ml-4 text-slate-300">
                {formatMarkdownText(news)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.recent_news)}</div>
        )
      )
    },
    {
      title: 'Industry Relevance',
      icon: '📊',
      fieldKey: 'industry_relevance',
      content: companyResearch?.industry_relevance && (
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.industry_relevance)}</div>
      )
    },
    {
      title: 'Hiring Focus',
      icon: '🎖️',
      fieldKey: 'hiring_focus',
      content: companyResearch?.hiring_focus && (
        <div className="text-sm leading-relaxed">{formatMarkdownText(companyResearch.hiring_focus)}</div>
      )
    }
  ]

  return (
    <div className="w-full space-y-6">
      {/* Modal */}
      <PromptTemplateModal isOpen={showPromptModal} onClose={() => setShowPromptModal(false)} />

      {/* Header with back button and save button in top right */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
            Interview Prep
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">{application.company_name} • {application.job_title}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || Object.keys(editedFields).length === 0}
            className={`px-4 py-2 font-bold uppercase text-sm transition-colors ${
              isSaving
                ? 'bg-yellow-600 text-white opacity-75 cursor-wait'
                : hasUnsavedChanges
                ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse'
                : 'bg-slate-600 text-slate-300 cursor-default'
            }`}
            style={{ borderRadius: '0px' }}
          >
            {isSaving ? '💾 Saving...' : hasUnsavedChanges ? '💾 Save Changes' : '✓ All Saved'}
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors"
            style={{ borderRadius: '0px' }}
          >
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 text-sm">
          {error}
        </div>
      )}

      {/* Upload Markdown Research Section */}
      <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 p-6 rounded">
        <h3 className="text-white font-bold mb-2">📄 Upload Company Research</h3>
        <p className="text-slate-400 text-sm mb-4">
          Have research from Claude, ChatGPT, or Gemini? Upload the markdown file here.
        </p>

        <label className="block">
          <input
            type="file"
            ref={fileInputRef}
            accept=".md"
            onChange={handleFileUpload}
            disabled={uploadLoading || !!pendingUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading || !!pendingUpload}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold uppercase text-sm transition-colors"
            style={{ borderRadius: '0px' }}
          >
            {uploadLoading ? '⟳ Uploading...' : '📤 Select .md File'}
          </button>
        </label>

        <p className="text-xs text-slate-500 mt-3">
          💡 <button onClick={() => setShowPromptModal(true)} className="text-blue-400 hover:underline cursor-pointer">Use the prompt template</button> with Claude, ChatGPT, or Gemini to research the company
        </p>
      </div>

      {/* Pending Upload Preview */}
      {pendingUpload && (
        <div className="bg-green-900/20 border-2 border-green-700 p-6 rounded">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">✓ Preview Loaded</h3>
            <button
              onClick={() => setPendingUpload(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕ Clear
            </button>
          </div>
          <p className="text-slate-300 text-sm mb-4">Review the data below. Click Submit to save this research.</p>

          {/* Quick preview of sections */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(pendingUpload).map(([key, value]) => {
              if (!value) return null
              const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              return (
                <div key={key} className="bg-slate-800/50 p-2 rounded text-xs">
                  <p className="text-slate-400 font-semibold">{label}</p>
                  <p className="text-slate-300 line-clamp-2">
                    {Array.isArray(value) ? value[0] : String(value).substring(0, 40)}...
                  </p>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirmUpload}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold uppercase text-sm transition-colors"
              style={{ borderRadius: '4px' }}
            >
              {isSaving ? '💾 Submitting...' : '✓ Submit'}
            </button>
            <button
              onClick={() => setPendingUpload(null)}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors"
              style={{ borderRadius: '4px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {researching && (
        <div className="bg-blue-900/30 border border-blue-700 text-blue-300 p-4 text-sm rounded animate-pulse">
          <p className="font-bold">⟳ Researching company...</p>
          <p className="text-xs text-blue-400 mt-1">This may take 1-2 minutes. Fetching website content and generating insights with AI</p>
          <p className="text-xs text-slate-400 mt-2">⏳ Please wait - the API has rate limits we respect to keep the service reliable</p>
        </div>
      )}

      {/* URL Inputs */}
      <div className="space-y-3">
        {/* Company Website */}
        <div className="bg-slate-800/50 border border-slate-700 p-4">
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase" style={{ letterSpacing: '0.5px' }}>
            Company Website (Optional)
          </label>
          <input
            type="text"
            value={companyWebsite}
            onChange={e => setCompanyWebsite(e.target.value)}
            placeholder="google.com or https://example.com"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            style={{ borderRadius: '0px' }}
          />
        </div>

        {/* Job Posting URL */}
        <div className="bg-slate-800/50 border border-slate-700 p-4">
          <label className="block text-xs font-bold text-slate-400 mb-2 uppercase" style={{ letterSpacing: '0.5px' }}>
            Job Posting URL (Optional)
          </label>
          <input
            type="text"
            value={application.job_url || ''}
            readOnly
            placeholder="Job posting URL from application"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-300 text-sm placeholder-slate-500 focus:outline-none"
            style={{ borderRadius: '0px' }}
          />
          {application.job_url && (
            <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:text-blue-300 mt-2 inline-block">
              🔗 Open Job Posting
            </a>
          )}
        </div>
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

          {/* Only show research content if not in error state */}
          {companyResearch?.data_source !== 'error' && (
            <>
              <div data-research-section className="flex items-center justify-between gap-2 flex-wrap">
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
                      onFieldChange={e => {
                        setEditedFields({...editedFields, [tile.fieldKey]: e.target.value})
                        setHasUnsavedChanges(true)
                      }}
                      onEdit={() => console.log(`Saved ${tile.fieldKey}:`, editedFields[tile.fieldKey])}
                      isFromFallback={isFromFallback(tile.fieldKey)}
                      isError={false}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 p-8 text-center">
          <p className="text-slate-400 mb-6">No research data yet. Click below to get started.</p>
          <div className="flex justify-center">
            <button
              onClick={handleResearch}
              disabled={researching}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '8px' }}
            >
              {researching ? '⟳ Researching...' : '🔍 Research Company'}
            </button>
          </div>
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

      {/* People Met Section */}
      <div className="border-t border-slate-700 pt-6 mt-6">
        <h3 className="font-bold text-white uppercase text-sm mb-3" style={{ letterSpacing: '0.5px' }}>
          👥 People Met
        </h3>

        {prep?.people_met && Array.isArray(JSON.parse(typeof prep.people_met === 'string' ? prep.people_met : JSON.stringify(prep.people_met))) && (
          <div className="space-y-2 mb-4">
            {JSON.parse(typeof prep.people_met === 'string' ? prep.people_met : JSON.stringify(prep.people_met)).map((person, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 p-3 space-y-1">
                <p className="font-bold text-white text-sm">{person.name}</p>
                {person.linkedin && (
                  <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:text-blue-300 break-all">
                    🔗 {person.linkedin}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            const name = prompt('Enter person\'s name:')
            if (!name) return
            const linkedin = prompt('Enter LinkedIn URL (optional):')

            const peopleMet = prep?.people_met
              ? JSON.parse(typeof prep.people_met === 'string' ? prep.people_met : JSON.stringify(prep.people_met))
              : []

            peopleMet.push({ name, linkedin: linkedin || null })

            setEditedFields(prev => ({
              ...prev,
              people_met: JSON.stringify(peopleMet)
            }))
            setHasUnsavedChanges(true)
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase transition-colors"
          style={{ borderRadius: '0px' }}
        >
          + Add Person
        </button>
      </div>
    </div>
  )
}
