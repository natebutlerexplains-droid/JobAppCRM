import { useState, useEffect } from 'react'
import api from './api'

const SETTINGS_KEY = 'app_settings'

const defaultSettings = {
  autoArchiveAfterDays: 90,
  followUpThresholdHours: 48,
}

export function Settings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [syncSchedule, setSyncSchedule] = useState(null)
  const [syncScheduleLoading, setSyncScheduleLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)
  const [geminiStatus, setGeminiStatus] = useState(null)
  const [geminiError, setGeminiError] = useState(null)
  const [geminiLoading, setGeminiLoading] = useState(true)

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    // Fetch sync schedule from backend
    const fetchSyncSchedule = async () => {
      try {
        setSyncScheduleLoading(true)
        const response = await api.get('/settings/sync-schedule')
        setSyncSchedule(response.data)
        setSyncError(null)
      } catch (error) {
        console.error('Failed to fetch sync schedule:', error)
        setSyncError('Unable to fetch sync schedule')
      } finally {
        setSyncScheduleLoading(false)
      }
    }

    fetchSyncSchedule()
  }, [])

  useEffect(() => {
    // Fetch Claude API status
    const fetchGeminiStatus = async () => {
      try {
        setGeminiLoading(true)
        const response = await api.get('/settings/gemini-keys')
        setGeminiStatus(response.data)
        setGeminiError(null)
      } catch (error) {
        console.error('Failed to fetch Claude API status:', error)
        setGeminiError('Unable to fetch API key status')
      } finally {
        setGeminiLoading(false)
      }
    }

    fetchGeminiStatus()
    // Refresh status every 30 seconds
    const interval = setInterval(fetchGeminiStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSyncScheduleChange = async (newSchedule) => {
    try {
      await api.post('/settings/sync-schedule', { schedule: newSchedule })
      setSyncSchedule({ ...syncSchedule, schedule: newSchedule })
      setSyncError(null)
    } catch (error) {
      console.error('Failed to update sync schedule:', error)
      setSyncError('Failed to save sync schedule')
    }
  }

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettings(defaultSettings)
      localStorage.removeItem(SETTINGS_KEY)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
          Settings
        </h2>
        <p className="text-slate-400 text-sm mt-2">Configure app preferences</p>
      </div>

      {saved && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 p-4 rounded">
          ✓ Settings saved
        </div>
      )}

      {/* Archive & Follow-up Settings */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-6" style={{ borderRadius: '8px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          📋 Application Preferences
        </h3>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">
            Auto-archive applications after (days): {settings.autoArchiveAfterDays}
          </label>
          <input
            type="range"
            min="30"
            max="365"
            step="15"
            value={settings.autoArchiveAfterDays || 90}
            onChange={(e) => setSettings({...settings, autoArchiveAfterDays: parseInt(e.target.value)})}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-2">
            Applications automatically move to archive after this many days with no status change
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">
            Follow-up nudge appears after (hours): {settings.followUpThresholdHours}
          </label>
          <input
            type="range"
            min="24"
            max="120"
            step="6"
            value={settings.followUpThresholdHours || 48}
            onChange={(e) => setSettings({...settings, followUpThresholdHours: parseInt(e.target.value)})}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-2">
            Dashboard cards show ⏰ Follow-up badge after this many hours since applying (if status unchanged)
          </p>
        </div>
      </div>

      {/* Email Sync Schedule */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '8px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          📧 Email Sync Schedule
        </h3>

        {syncError && (
          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 p-3 text-sm">
            ⚠️ {syncError}
          </div>
        )}

        {syncScheduleLoading ? (
          <p className="text-slate-400 text-sm">Loading sync schedule...</p>
        ) : (
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Sync frequency
            </label>
            <select
              value={syncSchedule?.schedule || 'daily'}
              onChange={(e) => handleSyncScheduleChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
              style={{ borderRadius: '4px' }}
            >
              <option value="daily">Daily (2:00 AM)</option>
              <option value="every_4_hours">Every 4 hours</option>
              <option value="manual_only">Manual only</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              When and how often to check email for new job postings
            </p>
            {syncSchedule?.next_sync_time && (
              <p className="text-xs text-slate-400 mt-2">
                Next sync: {new Date(syncSchedule.next_sync_time).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Claude API Configuration */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '8px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          🤖 Claude API
        </h3>

        {geminiLoading && (
          <p className="text-slate-400 text-sm">Loading API status...</p>
        )}

        {geminiError && (
          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 p-3 text-sm">
            ⚠️ {geminiError}
          </div>
        )}

        {geminiStatus && !geminiLoading && (
          <div className="space-y-3">
            <div className="bg-slate-700/50 p-3 rounded border border-slate-600">
              <div className="text-sm text-slate-300 mb-2">
                <span className="font-bold">Model:</span> {geminiStatus.model || 'claude-3-5-sonnet-20241022'}
              </div>
              <div className="text-sm text-slate-300 mb-2">
                <span className="font-bold">Status:</span> {geminiStatus.status === 'operational' ? '✓ Operational' : '⚠️ ' + geminiStatus.status}
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-bold">Rate Limit:</span> {geminiStatus.rate_limit || '100k tokens/minute'}
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Claude API is used for company research, interview question generation, and email classification. Configure your API key in <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">.env</code>
            </p>
          </div>
        )}
      </div>

      {/* Data Info */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-3" style={{ borderRadius: '8px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          💾 Your Data
        </h3>
        <p className="text-slate-400 text-sm">
          All data is stored locally on your computer in <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">jobs.db</code>
        </p>
        <p className="text-xs text-slate-500">
          No cloud storage. Zero data sharing. Your data is yours alone.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors"
          style={{ borderRadius: '4px' }}
        >
          ✓ Save Settings
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
          style={{ borderRadius: '4px' }}
        >
          ↻ Reset
        </button>
      </div>
    </div>
  )
}
