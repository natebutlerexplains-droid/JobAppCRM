import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'

export function ApplicationCard({ application, hasSuggestion, onClick, onDelete, isArchived, onPrepClick }) {
  const hasPendingSuggestion = hasSuggestion === true
  const hasRequiredFields = application.company_name && application.job_title && application.job_url

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(application.id)
    }
  }

  const handlePrepClick = (e) => {
    e.stopPropagation()
    if (onPrepClick) {
      onPrepClick(application)
    }
  }

  return (
    <div
      onClick={onClick}
      className="p-6 bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer group relative transition-colors duration-200"
      style={{ borderRadius: '0px' }}
    >
      {/* Delete button - visible on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-red-400"
          title={isArchived ? 'Permanently delete' : 'Move to trash'}
        >
          <Trash2 className="w-5 h-5 text-slate-500 hover:text-red-500" />
        </button>
      )}

      <div className="space-y-4">
        {/* Company Name */}
        <h3 className="font-black text-lg leading-tight text-white truncate" style={{ letterSpacing: '0.5px' }}>
          {application.company_name}
        </h3>

        {/* Job Title */}
        <p className="text-sm text-slate-300 truncate font-medium">
          {application.job_title}
        </p>

        {/* Date Applied */}
        <p className="text-xs text-slate-500 font-medium">
          {new Date(application.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Pending Suggestion Badge */}
        {hasPendingSuggestion && (
          <div className="pt-2">
            <Badge className="bg-blue-600 text-white border-0 font-bold uppercase text-xs" style={{ borderRadius: '4px', letterSpacing: '0.5px' }}>
              ⚡ Suggestion
            </Badge>
          </div>
        )}

        {/* Prep Button - only visible if required fields filled */}
        {hasRequiredFields && !isArchived && (
          <div className="pt-4 border-t border-slate-700 mt-4">
            <button
              onClick={handlePrepClick}
              className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold uppercase text-xs transition-colors"
              style={{ borderRadius: '0px', letterSpacing: '0.5px' }}
            >
              📚 Interview Prep
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
