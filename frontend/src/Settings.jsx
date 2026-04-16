import { useState, useEffect } from 'react'
import api from './api'

const SETTINGS_KEY = 'app_settings'

const defaultSettings = {
  defaultSalaryMin: 80000,
  defaultSalaryMax: 150000,
  autoArchiveAfterDays: 90,
  enableNotifications: true,
  darkMode: true,
  compactView: false,
  showArchivedByDefault: false,
}

export function Settings() {
  const [settings, setSettings] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [geminiStatus, setGeminiStatus] = useState(null)
  const [geminiError, setGeminiError] = useState(null)
  const [geminiLoading, setGeminiLoading] = useState(true)

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    // Fetch Gemini API key status
    const fetchGeminiStatus = async () => {
      try {
        setGeminiLoading(true)
        const response = await api.get('/settings/gemini-keys')
        setGeminiStatus(response.data)
        setGeminiError(null)
      } catch (error) {
        console.error('Failed to fetch Gemini key status:', error)
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
        <p className="text-slate-400 text-sm mt-2">Configure app preferences and defaults</p>
      </div>

      {saved && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 p-4 rounded">
          ✓ Settings saved
        </div>
      )}

      {/* Archive Settings */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          📦 Archive Preferences
        </h3>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showArchivedByDefault || false}
              onChange={(e) => setSettings({...settings, showArchivedByDefault: e.target.checked})}
              className="w-5 h-5"
            />
            <span className="text-slate-300">Show archived section expanded by default</span>
          </label>
        </div>

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
            Set to 365 to disable auto-archiving
          </p>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          🎨 Display
        </h3>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.compactView || false}
              onChange={(e) => setSettings({...settings, compactView: e.target.checked})}
              className="w-5 h-5"
            />
            <span className="text-slate-300">Compact card view</span>
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.darkMode !== false}
              onChange={(e) => setSettings({...settings, darkMode: e.target.checked})}
              className="w-5 h-5"
              disabled
            />
            <span className="text-slate-300">Dark mode (always enabled)</span>
          </label>
        </div>
      </div>

      {/* Gemini API Keys */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          🔑 Gemini API Keys
        </h3>

        {geminiLoading && (
          <p className="text-slate-400 text-sm">Loading key status...</p>
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
                <span className="font-bold">Active Key:</span> {geminiStatus.current_key}/{geminiStatus.total_keys}
              </div>
              <div className="text-sm text-slate-300 mb-2">
                <span className="font-bold">Available:</span> {geminiStatus.keys_available} key{geminiStatus.keys_available !== 1 ? 's' : ''}
              </div>
              {geminiStatus.quota_exhausted && geminiStatus.quota_exhausted.length > 0 && (
                <div className="text-sm text-orange-400 mb-2">
                  <span className="font-bold">Exhausted:</span> Key{geminiStatus.quota_exhausted.length !== 1 ? 's' : ''} {geminiStatus.quota_exhausted.join(', ')}
                </div>
              )}
              <div className="text-xs text-slate-500">
                <span className="font-bold">Quota:</span> {geminiStatus.quota_limit}/day per key
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {geminiStatus.keys_available > 0
                ? '✓ Fallback keys available. Research will automatically use the next key if current quota is exceeded.'
                : '⚠️ All API keys have exhausted their daily quota. Quota resets daily at midnight UTC.'}
            </p>

            <p className="text-xs text-slate-500">
              To add more keys, edit <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">.env</code> file with{' '}
              <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">GEMINI_API_KEY_2</code>,{' '}
              <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">GEMINI_API_KEY_3</code>, etc.
            </p>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-4" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          🔔 Notifications
        </h3>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableNotifications !== false}
              onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
              className="w-5 h-5"
            />
            <span className="text-slate-300">Enable browser notifications</span>
          </label>
        </div>

        <p className="text-xs text-slate-500">
          Receive notifications for upcoming interviews and follow-ups
        </p>
      </div>

      {/* Data Info */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-3" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          💾 Data
        </h3>
        <p className="text-slate-400 text-sm">
          All data is stored locally on your computer in <code className="bg-slate-900 px-2 py-1 rounded text-xs text-slate-200">jobs.db</code>
        </p>
        <p className="text-xs text-slate-500">
          No cloud services. Your data is yours alone.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors"
          style={{ borderRadius: '0px' }}
        >
          ✓ Save Settings
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
          style={{ borderRadius: '0px' }}
        >
          ↻ Reset to Defaults
        </button>
      </div>
    </div>
  )
}
