import { useState, useEffect, useRef } from 'react'
import { cancelEmailSync, getGeminiHealth, getSyncLogs, runEmailSync } from './api'
import axios from 'axios'

export function Settings() {
  const [syncLogs, setSyncLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [geminiHealth, setGeminiHealth] = useState(null)
  const [checkingGemini, setCheckingGemini] = useState(false)
  const [authStatus, setAuthStatus] = useState(null) // null = unknown, true = connected, false = not connected
  const [deviceFlow, setDeviceFlow] = useState(null) // { user_code, verification_uri, message }
  const [connectingOutlook, setConnectingOutlook] = useState(false)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    loadSyncLogs()
    checkAuthStatus()
    checkGeminiHealth()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get('/api/auth/status')
      setAuthStatus(res.data.authenticated)
    } catch (err) {
      setAuthStatus(false)
    }
  }

  const checkGeminiHealth = async () => {
    setCheckingGemini(true)
    try {
      const res = await getGeminiHealth()
      setGeminiHealth(res.data)
    } catch (err) {
      setGeminiHealth({ ok: false, error: err.response?.data?.error || err.message })
    } finally {
      setCheckingGemini(false)
    }
  }

  const loadSyncLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getSyncLogs(10)
      setSyncLogs(response.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectOutlook = async () => {
    setConnectingOutlook(true)
    setError(null)
    setDeviceFlow(null)

    try {
      const res = await axios.post('/api/auth/initiate')
      setDeviceFlow(res.data)

      // Start polling for completion
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await axios.post('/api/auth/poll')
          if (pollRes.data.status === 'success') {
            clearInterval(pollIntervalRef.current)
            setDeviceFlow(null)
            setConnectingOutlook(false)
            setAuthStatus(true)
            setSyncStatus('Outlook connected successfully!')
          } else if (pollRes.data.status === 'error') {
            clearInterval(pollIntervalRef.current)
            setDeviceFlow(null)
            setConnectingOutlook(false)
            setError(pollRes.data.message)
          }
          // 'pending' = still waiting, keep polling
        } catch (err) {
          clearInterval(pollIntervalRef.current)
          setConnectingOutlook(false)
          setError('Error checking login status')
        }
      }, 3000)
    } catch (err) {
      setConnectingOutlook(false)
      setError(err.response?.data?.error || err.message || 'Failed to start login')
    }
  }

  const handleRunSync = async () => {
    setSyncing(true)
    setSyncStatus(null)
    setError(null)

    try {
      await runEmailSync()
      setSyncStatus('Sync started...')

      let isComplete = false
      let attempts = 0
      const maxAttempts = 60

      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))

        try {
          const logsResponse = await getSyncLogs(10)
          const latestLog = logsResponse.data?.[0]

          if (latestLog && latestLog.status === 'running') {
            const processed = latestLog.emails_processed || 0
            const fetched = latestLog.emails_fetched || 0
            let etaText = ''
            if (processed > 0 && fetched > 0 && latestLog.started_at) {
              const elapsedSec = Math.max(1, (Date.now() - new Date(latestLog.started_at)) / 1000)
              const rate = processed / elapsedSec
              const remaining = Math.max(0, fetched - processed)
              if (rate > 0) {
                const etaSec = Math.round(remaining / rate)
                etaText = ` • ETA ${formatEta(etaSec)}`
              }
            }
            setSyncStatus(`Sync running: ${processed}/${fetched || '?'} emails processed${etaText}`)
          }

          if (latestLog && (latestLog.status === 'completed' || latestLog.status === 'error' || latestLog.status === 'failed' || latestLog.status === 'cancelled')) {
            isComplete = true
            if (latestLog.status === 'completed') {
              setSyncStatus(
                `Sync completed: ${latestLog.emails_processed || 0} emails processed, ` +
                `${latestLog.apps_created || 0} apps created`
              )
            } else if (latestLog.status === 'cancelled') {
              setSyncStatus('Sync cancelled.')
            } else {
              setError('Sync failed. Check that Outlook is connected.')
            }
            setSyncLogs(logsResponse.data || [])
          }
        } catch (err) {
          console.error('Error checking sync status:', err)
        }

        attempts++
      }

      if (!isComplete) {
        setSyncStatus('Sync is still in progress. Check back shortly.')
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setSyncStatus('Sync already running.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to start sync')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleCancelSync = async () => {
    setError(null)
    try {
      await cancelEmailSync()
      setSyncStatus('Cancel requested...')
    } catch (err) {
      if (err.response?.status === 409) {
        setSyncStatus('No running sync to cancel.')
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to cancel sync')
      }
    }
  }

  const getLastSyncTime = () => {
    if (syncLogs.length === 0) return 'Never'
    const lastLog = syncLogs[0]
    if (!lastLog.finished_at) return 'In progress...'
    return new Date(lastLog.finished_at).toLocaleString()
  }

  const getDuration = (log) => {
    if (!log.started_at || !log.finished_at) return 'N/A'
    const seconds = Math.round((new Date(log.finished_at) - new Date(log.started_at)) / 1000)
    return `${seconds}s`
  }

  const formatEta = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return 'N/A'
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) return `${hrs}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  const isRunning = syncLogs[0]?.status === 'running' || syncing

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage email sync and view sync history</p>
      </div>

      {/* Outlook Connection */}
      <div className="bg-card border rounded p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Outlook Connection</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${authStatus === true ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm text-foreground">
              {authStatus === true ? 'Connected to nate.butler.clt@outlook.com' : 'Not connected'}
            </span>
          </div>

          {authStatus !== true && !connectingOutlook && (
            <button
              onClick={handleConnectOutlook}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 font-medium"
            >
              Connect Outlook Account
            </button>
          )}

          {/* Device Flow Instructions */}
          {deviceFlow && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-3">
              <p className="font-semibold text-blue-900">Sign in to Microsoft</p>
              <p className="text-sm text-blue-800">
                1. Go to:{' '}
                <a
                  href={deviceFlow.verification_uri}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-mono"
                >
                  {deviceFlow.verification_uri}
                </a>
              </p>
              <p className="text-sm text-blue-800">
                2. Enter this code:
              </p>
              <p className="text-3xl font-mono font-bold text-blue-900 tracking-widest">
                {deviceFlow.user_code}
              </p>
              <p className="text-xs text-blue-600">
                Waiting for you to complete sign-in...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gemini Health */}
      <div className="bg-card border rounded p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Gemini Health</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${
              geminiHealth?.ok ? 'bg-green-500' : geminiHealth ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-foreground">
              {geminiHealth?.ok ? 'Gemini is responding' : geminiHealth ? 'Gemini check failed' : 'Not checked'}
            </span>
          </div>
          {geminiHealth?.model && (
            <div className="text-xs text-muted-foreground">Model: {geminiHealth.model}</div>
          )}
          {geminiHealth?.error && (
            <div className="text-xs text-destructive">Error: {geminiHealth.error}</div>
          )}
          {geminiHealth?.result && (
            <div className="text-xs text-muted-foreground">
              Last result: {geminiHealth.result.email_type || 'unknown'} (confidence {geminiHealth.result.confidence ?? 0})
            </div>
          )}
          <button
            onClick={checkGeminiHealth}
            disabled={checkingGemini}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            {checkingGemini ? 'Checking...' : 'Run Gemini Health Check'}
          </button>
        </div>
      </div>

      {/* Email Sync */}
      <div className="bg-card border rounded p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Email Sync</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Last Sync</p>
            <p className="text-lg font-medium text-foreground mt-1">{getLastSyncTime()}</p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded text-sm">
              {error}
            </div>
          )}

          {syncStatus && !error && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-900 rounded text-sm">
              ✓ {syncStatus}
            </div>
          )}

          <button
            onClick={handleRunSync}
            disabled={syncing || loading || authStatus !== true}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            {syncing ? 'Syncing...' : 'Run Sync Now'}
          </button>
          <button
            onClick={handleCancelSync}
            disabled={!isRunning}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            Cancel Sync
          </button>
          {authStatus !== true && (
            <p className="text-xs text-muted-foreground">Connect Outlook above before syncing.</p>
          )}
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-card border rounded p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Sync History</h2>

        {loading && syncLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Loading sync history...</div>
        ) : syncLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No sync history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Duration</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">Emails Processed</th>
                  <th className="text-right py-3 px-4 font-semibold text-foreground">Apps Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-foreground">
                      {log.started_at ? new Date(log.started_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-foreground">{getDuration(log)}</td>
                    <td className="py-3 px-4 text-right text-foreground">{log.emails_processed || 0}</td>
                    <td className="py-3 px-4 text-right text-foreground">{log.apps_created || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        log.status === 'completed' ? 'bg-green-50 text-green-700' :
                        log.status === 'running' ? 'bg-blue-50 text-blue-700' :
                        log.status === 'cancelled' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {log.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
