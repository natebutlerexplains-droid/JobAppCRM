import { useState, useEffect } from 'react'

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

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      setSettings(JSON.parse(saved))
    }
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

      {/* Salary Settings */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-6" style={{ borderRadius: '0px' }}>
        <h3 className="font-bold text-white uppercase text-sm" style={{ letterSpacing: '0.5px' }}>
          💰 Salary Defaults
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Default Minimum Salary: ${settings.defaultSalaryMin?.toLocaleString()}
            </label>
            <input
              type="range"
              min="30000"
              max="300000"
              step="5000"
              value={settings.defaultSalaryMin || 80000}
              onChange={(e) => setSettings({...settings, defaultSalaryMin: parseInt(e.target.value)})}
              className="w-full"
            />
            <div className="flex gap-4 mt-2">
              <input
                type="number"
                value={settings.defaultSalaryMin || 80000}
                onChange={(e) => setSettings({...settings, defaultSalaryMin: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 text-white rounded"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">
              Default Maximum Salary: ${settings.defaultSalaryMax?.toLocaleString()}
            </label>
            <input
              type="range"
              min="50000"
              max="500000"
              step="5000"
              value={settings.defaultSalaryMax || 150000}
              onChange={(e) => setSettings({...settings, defaultSalaryMax: parseInt(e.target.value)})}
              className="w-full"
            />
            <div className="flex gap-4 mt-2">
              <input
                type="number"
                value={settings.defaultSalaryMax || 150000}
                onChange={(e) => setSettings({...settings, defaultSalaryMax: parseInt(e.target.value)})}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 text-white rounded"
                style={{ borderRadius: '0px' }}
              />
            </div>
          </div>
        </div>
      </div>

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
