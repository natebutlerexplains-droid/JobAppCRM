import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

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
export const reorderApplications = (orders) => api.post('/applications/reorder', { orders })

// Emails
export const getApplicationEmails = (id) => api.get(`/applications/${id}/emails`)

// Interactions
export const getApplicationInteractions = (id) => api.get(`/applications/${id}/interactions`)
export const createInteraction = (appId, data) => api.post(`/applications/${appId}/interactions`, data)
export const getFilterOptions = () => api.get('/filter-options')

// Stats
export const getStats = () => api.get('/stats')

// Stage Suggestions
export const getStageSuggestions = () => api.get('/stage-suggestions')
export const updateStageSuggestion = (id, data) => api.patch(`/stage-suggestions/${id}`, data)

// Interview Prep
export const getInterviewPrepHistory = () => api.get('/prep/history')
export const getInterviewPrep = (appId) => api.get(`/applications/${appId}/prep`)
export const deleteInterviewPrep = (appId) => api.delete(`/applications/${appId}/prep`)
export const researchCompanyPrep = (appId, data = {}) => api.post(`/applications/${appId}/prep/research`, data)
export const generateInterviewQuestions = (appId) => api.post(`/applications/${appId}/prep/generate`)
export const uploadMarkdownResearch = (appId, parsedResearch) => api.post(`/applications/${appId}/prep/research-markdown`, {
  company_research: parsedResearch
})

// Interview Prep
export const getApplicationPrep = (id) => api.get(`/applications/${id}/prep`)
export const researchCompany = (id) => api.post(`/applications/${id}/prep/research`)
export const generateInterviewPrep = (id) => api.post(`/applications/${id}/prep/generate`)
export const submitQuizAnswer = (id, question, userAnswer) =>
  api.post(`/applications/${id}/prep/quiz`, { question, user_answer: userAnswer })
export const getPrepHistory = () => api.get('/prep/history')

export default api
