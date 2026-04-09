import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Parse a date string (YYYY-MM-DD) or ISO timestamp without timezone conversion.
 * Prevents JavaScript from interpreting dates as UTC and converting to local timezone.
 */
export const formatDate = (dateString) => {
  if (!dateString) return ''
  // If it's just a date (YYYY-MM-DD), parse it directly
  if (dateString.length === 10) {
    const [year, month, day] = dateString.split('-')
    return new Date(year, month - 1, day).toLocaleDateString()
  }
  // If it's an ISO timestamp, extract the date part and parse
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-')
  return new Date(year, month - 1, day).toLocaleDateString()
}

// Applications
export const getApplications = (search = '', status = '', emailType = '') => {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (status) params.append('status', status)
  if (emailType) params.append('email_type', emailType)
  const queryString = params.toString()
  return api.get(`/applications${queryString ? '?' + queryString : ''}`)
}
export const createApplication = (data) => api.post('/applications', data)
export const getApplication = (id) => api.get(`/applications/${id}`)
export const updateApplication = (id, data) => api.patch(`/applications/${id}`, data)
export const deleteApplication = (id) => api.delete(`/applications/${id}`)
export const getApplicationEmails = (id) => api.get(`/applications/${id}/emails`)
export const getApplicationInteractions = (id) => api.get(`/applications/${id}/interactions`)
export const createInteraction = (appId, data) => api.post(`/applications/${appId}/interactions`, data)
export const getFilterOptions = () => api.get('/filter-options')

// Stats
export const getStats = () => api.get('/stats')

// Stage Suggestions
export const getStageSuggestions = () => api.get('/stage-suggestions')
export const updateStageSuggestion = (id, data) => api.patch(`/stage-suggestions/${id}`, data)

// Emails
export const getUnlinkedEmails = () => api.get('/emails/unlinked')
export const getNonJobRelatedEmails = () => api.get('/emails/non-job-related')
export const getJobLeads = () => api.get('/emails/job-leads')
export const linkEmail = (emailId, appId) => api.patch(`/emails/${emailId}/link`, { app_id: appId })
export const processUnlinkedEmails = (limit = null) => api.post('/emails/process-unlinked', { limit })
export const reclassifyEmails = (category = 'unrelated', limit = 20) => api.post('/emails/reclassify', { category, limit })
export const correctEmailClassification = (emailId, correctedCategory, reasonCode) =>
  api.post(`/emails/${emailId}/correct`, { corrected_category: correctedCategory, reason_code: reasonCode })
export const trashEmail = (emailId, reasonCode = 'CONFIRMED_SPAM') =>
  api.delete(`/emails/${emailId}`, { data: { reason_code: reasonCode } })

// Sync Logs
export const getSyncLogs = (limit = 10) => api.get(`/sync-logs?limit=${limit}`)
export const runEmailSync = () => api.post('/run-email-sync')
export const cancelEmailSync = () => api.post('/cancel-email-sync')

// Classifier Feedback & Training
export const getClassifierStats = () => api.get('/classifier/stats')

// Gemini Health
export const getGeminiHealth = () => api.get('/gemini/health')

// Interview Prep
export const getApplicationPrep = (id) => api.get(`/applications/${id}/prep`)
export const researchCompany = (id) => api.post(`/applications/${id}/prep/research`)
export const generateInterviewPrep = (id) => api.post(`/applications/${id}/prep/generate`)
export const submitQuizAnswer = (id, question, userAnswer) =>
  api.post(`/applications/${id}/prep/quiz`, { question, user_answer: userAnswer })
export const getPrepHistory = () => api.get('/prep/history')

export default api
