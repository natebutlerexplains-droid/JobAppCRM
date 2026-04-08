import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// Sync Logs
export const getSyncLogs = (limit = 10) => api.get(`/sync-logs?limit=${limit}`)
export const runEmailSync = () => api.post('/run-email-sync')
export const cancelEmailSync = () => api.post('/cancel-email-sync')

// Gemini Health
export const getGeminiHealth = () => api.get('/gemini/health')

export default api
