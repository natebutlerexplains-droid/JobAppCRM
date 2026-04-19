import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from './firebase'
import { useState } from 'react'

export function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-black uppercase text-white mb-2" style={{ letterSpacing: '2px' }}>
            <span style={{ color: '#3b82f6' }}>→</span><span>PIPELINE</span>
          </h1>
          <p className="text-slate-400">Job Application Tracker</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-lg space-y-6">
          <p className="text-slate-300 text-sm">Sign in with your Google account to get started</p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold uppercase transition-colors disabled:opacity-50"
            style={{ borderRadius: '4px' }}
          >
            {loading ? 'Signing in...' : '🔐 Sign in with Google'}
          </button>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 text-sm rounded">
              {error}
            </div>
          )}

          <p className="text-slate-500 text-xs">
            We only access your name and email. Your data is private and encrypted.
          </p>
        </div>
      </div>
    </div>
  )
}
