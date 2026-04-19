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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md px-4 sm:px-0">
        {/* Logo */}
        <div className="text-center mb-8 sm:mb-12 flex items-center justify-center gap-2 sm:gap-3">
          <span className="text-3xl sm:text-5xl font-black" style={{ color: '#3b82f6', letterSpacing: '1px' }}>→</span>
          <h1 className="text-3xl sm:text-5xl font-black uppercase text-white" style={{ letterSpacing: '3px' }}>PIPELINE</h1>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Sign in</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Continue with your Google account</p>
          </div>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm sm:text-base transition-all duration-200 rounded-lg shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#4285F4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="hidden sm:inline">{loading ? 'Signing in...' : 'Continue with Google'}</span>
            <span className="sm:hidden">{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 sm:p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs sm:text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="pt-4 sm:pt-6 border-t border-slate-700/30">
            <p className="text-slate-500 text-xs text-center leading-relaxed">
              By signing in, you agree to our privacy policy. We only access your name and email address.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6 sm:mt-8 font-medium tracking-wide">
          SECURE • PRIVATE • ENCRYPTED
        </p>
      </div>
    </div>
  )
}
