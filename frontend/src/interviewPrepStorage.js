// Simple localStorage management for interview prep sessions

const STORAGE_KEY = 'interview_prep_sessions'

export const saveInterviewPrepSession = (appId, companyName, jobTitle, research, questions) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')

    // Check if session already exists and update it
    const existingIndex = sessions.findIndex(s => s.appId === appId)

    const session = {
      appId,
      companyName,
      jobTitle,
      research,
      questions,
      savedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      sessions[existingIndex] = session
    } else {
      sessions.unshift(session) // Add to beginning
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    return session
  } catch (err) {
    console.error('Error saving interview prep session:', err)
    return null
  }
}

export const getSavedInterviewPrepSessions = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch (err) {
    console.error('Error getting interview prep sessions:', err)
    return []
  }
}

export const getInterviewPrepSession = (appId) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return sessions.find(s => s.appId === appId)
  } catch (err) {
    console.error('Error getting interview prep session:', err)
    return null
  }
}

export const deleteInterviewPrepSession = (appId) => {
  try {
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const filtered = sessions.filter(s => s.appId !== appId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (err) {
    console.error('Error deleting interview prep session:', err)
    return false
  }
}
