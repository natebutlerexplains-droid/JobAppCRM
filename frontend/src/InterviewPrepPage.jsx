import { useState, useEffect } from 'react'
import { getApplicationPrep, researchCompany, generateInterviewPrep, submitQuizAnswer } from './api'

export function InterviewPrepPage({ applicationId, application, onBack }) {
  const [prep, setPrep] = useState(null)
  const [activeTab, setActiveTab] = useState('research')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [researching, setResearching] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState('')
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)

  useEffect(() => {
    loadPrep()
  }, [applicationId])

  const loadPrep = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getApplicationPrep(applicationId)
      setPrep(res.data)
    } catch (err) {
      setError(err.message || 'Failed to load interview prep')
      console.error('Error loading prep:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResearchCompany = async () => {
    setResearching(true)
    setError(null)
    try {
      const res = await researchCompany(applicationId)
      setPrep(res.data)
      setActiveTab('questions')
    } catch (err) {
      setError(err.message || 'Failed to research company')
      console.error('Error researching:', err)
    } finally {
      setResearching(false)
    }
  }

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true)
    setError(null)
    try {
      const res = await generateInterviewPrep(applicationId)
      setPrep(res.data)
      setActiveTab('quiz')
      setQuizIndex(0)
      setQuizAnswer('')
    } catch (err) {
      setError(err.message || 'Failed to generate questions')
      console.error('Error generating questions:', err)
    } finally {
      setGeneratingQuestions(false)
    }
  }

  const handleSubmitQuizAnswer = async () => {
    if (!quizAnswer.trim()) return

    setSubmittingQuiz(true)
    setError(null)
    try {
      const questions = prep?.interview_questions ? JSON.parse(prep.interview_questions) : []
      const currentQuestion = questions[quizIndex]

      const res = await submitQuizAnswer(applicationId, currentQuestion.question, quizAnswer)
      const result = res.data

      setQuizScore(result.score)
      setQuizFeedback(result.feedback)

      // Move to next question after a delay
      setTimeout(() => {
        if (quizIndex < questions.length - 1) {
          setQuizIndex(quizIndex + 1)
          setQuizAnswer('')
          setQuizScore(null)
          setQuizFeedback(null)
          loadPrep()
        } else {
          // Completed all questions
          loadPrep()
        }
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to submit answer')
      console.error('Error submitting answer:', err)
    } finally {
      setSubmittingQuiz(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading interview prep...</p>
        </div>
      </div>
    )
  }

  // Parse JSON fields
  const companyResearch = prep?.company_research ? JSON.parse(prep.company_research) : null
  const interviewQuestions = prep?.interview_questions ? JSON.parse(prep.interview_questions) : []
  const questionsToAsk = prep?.questions_to_ask ? JSON.parse(prep.questions_to_ask) : []
  const quizResults = prep?.quiz_results ? JSON.parse(prep.quiz_results) : []

  const currentQuestion = interviewQuestions[quizIndex]
  const completedQuizzes = quizResults.length
  const averageScore = quizResults.length > 0
    ? (quizResults.reduce((sum, q) => sum + (q.score || 0), 0) / quizResults.length).toFixed(1)
    : null

  const hasResearch = !!companyResearch
  const hasQuestions = interviewQuestions.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{application?.company_name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{application?.job_title}</p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Salary & Negotiation Banner */}
          {(application?.salary_min || application?.salary_max || application?.salary_negotiation_target) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900 mb-4">
              <div>
                💰 Your range: ${application.salary_min?.toLocaleString() || '?'} – ${application.salary_max?.toLocaleString() || '?'}
              </div>
              {application?.salary_negotiation_target && (
                <div className="mt-1 text-sm">
                  🎯 Asking price: ${application.salary_negotiation_target.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-t pt-3">
            {['research', 'questions', 'quiz'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={
                  (tab === 'questions' && !hasResearch) ||
                  (tab === 'quiz' && !hasQuestions)
                }
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {tab === 'research' && '📚 Research'}
                {tab === 'questions' && '❓ Questions'}
                {tab === 'quiz' && '🎯 Quiz'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded mb-6">
            {error}
          </div>
        )}

        {/* Research Tab */}
        {activeTab === 'research' && (
          <div className="space-y-6">
            {!companyResearch ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">No company research yet. Click below to generate AI-powered research about the company.</p>
                <button
                  onClick={handleResearchCompany}
                  disabled={researching}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {researching ? 'Researching...' : '🔍 Research Company'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-3">Company Overview</h2>
                  <p className="text-foreground">{companyResearch.summary}</p>
                </div>

                {companyResearch.business_model && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Business Model</h2>
                    <p className="text-foreground">{companyResearch.business_model}</p>
                  </div>
                )}

                {companyResearch.culture_notes && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Company Culture</h2>
                    <p className="text-foreground">{companyResearch.culture_notes}</p>
                  </div>
                )}

                {companyResearch.key_facts && companyResearch.key_facts.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Key Facts</h2>
                    <ul className="space-y-2">
                      {companyResearch.key_facts.map((fact, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-primary">•</span>
                          <span className="text-foreground">{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {companyResearch.recent_news && companyResearch.recent_news.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Recent News</h2>
                    <ul className="space-y-2">
                      {companyResearch.recent_news.map((news, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-primary">📰</span>
                          <span className="text-foreground">{news}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={handleResearchCompany}
                  disabled={researching}
                  className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/80 disabled:opacity-50 transition-colors"
                >
                  {researching ? 'Updating...' : '🔄 Update Research'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Interview Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {!hasQuestions ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-6">No interview questions yet. Click below to generate AI-powered questions.</p>
                <button
                  onClick={handleGenerateQuestions}
                  disabled={generatingQuestions || !hasResearch}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {generatingQuestions ? 'Generating...' : '✨ Generate Questions'}
                </button>
                {!hasResearch && <p className="text-xs text-muted-foreground mt-2">Complete research first</p>}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Behavioral Questions */}
                {interviewQuestions.some(q => q.category === 'behavioral') && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Behavioral Questions</h2>
                    <div className="space-y-3">
                      {interviewQuestions
                        .filter(q => q.category === 'behavioral')
                        .map((q, idx) => (
                          <details key={idx} className="border rounded p-4">
                            <summary className="font-medium cursor-pointer hover:text-primary transition-colors">
                              {q.question}
                            </summary>
                            {q.answer_hint && (
                              <p className="text-sm text-muted-foreground mt-3">💡 Hint: {q.answer_hint}</p>
                            )}
                          </details>
                        ))}
                    </div>
                  </div>
                )}

                {/* Technical Questions */}
                {interviewQuestions.some(q => q.category === 'technical') && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Technical Questions</h2>
                    <div className="space-y-3">
                      {interviewQuestions
                        .filter(q => q.category === 'technical')
                        .map((q, idx) => (
                          <details key={idx} className="border rounded p-4">
                            <summary className="font-medium cursor-pointer hover:text-primary transition-colors">
                              {q.question}
                            </summary>
                            {q.answer_hint && (
                              <p className="text-sm text-muted-foreground mt-3">💡 Hint: {q.answer_hint}</p>
                            )}
                          </details>
                        ))}
                    </div>
                  </div>
                )}

                {/* Situational Questions */}
                {interviewQuestions.some(q => q.category === 'situational') && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Situational Questions</h2>
                    <div className="space-y-3">
                      {interviewQuestions
                        .filter(q => q.category === 'situational')
                        .map((q, idx) => (
                          <details key={idx} className="border rounded p-4">
                            <summary className="font-medium cursor-pointer hover:text-primary transition-colors">
                              {q.question}
                            </summary>
                            {q.answer_hint && (
                              <p className="text-sm text-muted-foreground mt-3">💡 Hint: {q.answer_hint}</p>
                            )}
                          </details>
                        ))}
                    </div>
                  </div>
                )}

                {/* Questions to Ask */}
                {questionsToAsk.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Questions to Ask the Interviewer</h2>
                    <ul className="space-y-2">
                      {questionsToAsk.map((q, idx) => (
                        <li key={idx} className="flex gap-3 text-foreground">
                          <span className="text-primary font-semibold">{idx + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {!hasQuestions ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Generate questions first to start the quiz</p>
              </div>
            ) : (
              <div>
                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Progress: {completedQuizzes} of {interviewQuestions.length} answered</p>
                    {averageScore && (
                      <p className="text-sm font-medium">Average Score: {averageScore}/10</p>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(completedQuizzes / interviewQuestions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question */}
                {currentQuestion ? (
                  <div className="space-y-4 bg-card border rounded-lg p-6">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-2">
                        Question {quizIndex + 1} of {interviewQuestions.length}
                      </h2>
                      <p className="text-foreground text-base">{currentQuestion.question}</p>
                    </div>

                    {!quizScore ? (
                      <>
                        <textarea
                          value={quizAnswer}
                          onChange={(e) => setQuizAnswer(e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full px-3 py-2 border rounded bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none h-32"
                        />
                        <button
                          onClick={handleSubmitQuizAnswer}
                          disabled={submittingQuiz || !quizAnswer.trim()}
                          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
                        >
                          {submittingQuiz ? 'Scoring...' : '✨ Submit Answer'}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-4 rounded ${quizScore >= 7 ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <p className={`text-lg font-semibold ${quizScore >= 7 ? 'text-green-800' : 'text-blue-800'}`}>
                            Score: {quizScore}/10
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2">Feedback:</p>
                          <p className="text-foreground">{quizFeedback}</p>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Moving to next question...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-card border rounded-lg">
                    <p className="text-lg font-semibold text-foreground mb-2">Great job! 🎉</p>
                    <p className="text-muted-foreground">You've completed all interview questions.</p>
                    {averageScore && (
                      <p className="text-lg font-semibold mt-4">Final Score: {averageScore}/10</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
