import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Applications
export const getApplications = () => api.get('/applications')
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

// Stats
export const getStats = () => api.get('/stats')

// Stage Suggestions
export const getStageSuggestions = () => api.get('/stage-suggestions')
export const updateStageSuggestion = (id, data) => api.patch(`/stage-suggestions/${id}`, data)

// Interview Prep
export const getInterviewPrepHistory = () => api.get('/prep/history')
export const getInterviewPrep = (appId) => api.get(`/applications/${appId}/prep`)
export const researchCompanyPrep = (appId, data = {}) => api.post(`/applications/${appId}/prep/research`, data)
export const generateInterviewQuestions = (appId) => api.post(`/applications/${appId}/prep/generate`)
export const uploadMarkdownResearch = (appId, parsedResearch) => api.post(`/applications/${appId}/prep/research-markdown`, {
  company_research: parsedResearch
})

export default api
