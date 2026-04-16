import { useState } from 'react'
import { X } from 'lucide-react'

export function InterviewPrepURLModal({ application, isOpen, onClose, onSubmit, isLoading }) {
  const [url, setUrl] = useState(application?.company_website || '')
  const [error, setError] = useState(null)

  const handleSubmit = () => {
    setError(null)

    // Validate URL format (basic check)
    if (url.trim() && !url.match(/^https?:\/\/|^[\w-]+(\.[\w-]+)+$/)) {
      setError('Please enter a valid URL (e.g., google.com or https://example.com)')
      return
    }

    // Submit the URL
    onSubmit(url.trim() || null)
  }

  const handleSkip = () => {
    onSubmit(null)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 max-w-md w-full" style={{ borderRadius: '0px' }}>
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
                Company Website
              </h2>
              <p className="text-slate-400 text-sm mt-2 font-medium">Optional but recommended</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                Company Website URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isLoading && handleSubmit()}
                placeholder="google.com or https://example.com"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                style={{ borderRadius: '0px' }}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                We'll crawl this website to gather company info, org structure, CEO info, and more for your interview prep.
              </p>
            </div>

            {application?.company_website && url !== application.company_website && (
              <div className="bg-blue-900/20 border border-blue-700 text-blue-300 p-3 text-xs">
                This differs from the saved URL: {application.company_website}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0px' }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !url.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '0px' }}
              >
                {isLoading ? 'Researching...' : 'Research'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
