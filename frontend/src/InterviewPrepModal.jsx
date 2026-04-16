import { useState, useEffect } from 'react'
import { researchCompanyPrep, generateInterviewQuestions } from './api'
import { saveInterviewPrepSession } from './interviewPrepStorage'
import { X } from 'lucide-react'

export function InterviewPrepModal({ application, isOpen, onClose }) {
  const [step, setStep] = useState('review') // review, research, questions
  const [research, setResearch] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen || !application) return null

  const hasRequiredFields = application.company_name && application.job_title && application.job_url

  const handleResearch = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await researchCompanyPrep(application.id)
      setResearch(res.data)
      setStep('research')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await generateInterviewQuestions(application.id)
      setQuestions(res.data)
      setStep('questions')
      // Save session when questions are generated
      saveInterviewPrepSession(application.id, application.company_name, application.job_title, research, res.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '0px' }}>
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
                Interview Prep
              </h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">{application.company_name} • {application.job_title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded">
                {error}
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Required Info</h3>
                  <div className="space-y-3 bg-slate-800/50 p-6 border border-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Company:</span>
                      <span className="text-white font-medium">{application.company_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3">
                      <span className="text-slate-400">Position:</span>
                      <span className="text-white font-medium">{application.job_title}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3">
                      <span className="text-slate-400">Job URL:</span>
                      <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">
                        Link
                      </a>
                    </div>
                  </div>
                </div>

                {application.salary_min && (
                  <div>
                    <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Salary Context</h3>
                    <div className="bg-slate-800/50 p-6 border border-slate-700 space-y-2">
                      <p className="text-slate-300">Range: ${application.salary_min?.toLocaleString()} - ${application.salary_max?.toLocaleString()}</p>
                      {application.salary_negotiation_target && (
                        <p className="text-blue-400">Your asking price: ${application.salary_negotiation_target?.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleResearch}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                >
                  {loading ? 'Researching...' : '🔍 Research Company'}
                </button>
              </div>
            )}

            {step === 'research' && research && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4">
                  <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>Company Overview</h3>
                  <p className="text-slate-300">{research.company_research.company_overview}</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4">
                  <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>Key Products & Services</h3>
                  <ul className="space-y-2">
                    {research.company_research.key_products?.map((product, i) => (
                      <li key={i} className="text-slate-300 flex items-start gap-3">
                        <span className="text-blue-400 font-bold">→</span>
                        {product}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4">
                  <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>Company Culture</h3>
                  <p className="text-slate-300">{research.company_research.company_culture}</p>
                </div>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors disabled:opacity-50"
                  style={{ borderRadius: '0px' }}
                >
                  {loading ? 'Generating...' : '❓ Generate Interview Questions'}
                </button>
              </div>
            )}

            {step === 'questions' && questions && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Likely Interview Questions</h3>
                  <div className="space-y-4">
                    {questions.prep_questions.interview_questions.map((q, i) => (
                      <div key={i} className="bg-slate-800/50 border border-slate-700 p-4">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="text-white font-medium text-sm">{q.question}</p>
                          <span className="text-xs font-bold uppercase text-slate-500">{q.difficulty}</span>
                        </div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide">{q.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Questions to Ask Them</h3>
                  <div className="space-y-3">
                    {questions.prep_questions.questions_to_ask.map((q, i) => (
                      <div key={i} className="flex gap-3 text-slate-300">
                        <span className="text-blue-400 font-bold">•</span>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  ✓ Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
