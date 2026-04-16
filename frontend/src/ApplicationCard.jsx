import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'

export function ApplicationCard({ application, hasSuggestion, onClick, onDelete, isArchived }) {
  const hasPendingSuggestion = hasSuggestion === true

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(application.id)
    }
  }

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-white dark:bg-slate-800 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer border border-slate-200 dark:border-slate-700 group relative overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-transparent dark:group-hover:from-blue-900/20 dark:group-hover:to-transparent transition-all duration-200 pointer-events-none" />

      {/* Delete button - visible on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
          title={isArchived ? 'Permanently delete' : 'Move to trash'}
        >
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
        </button>
      )}

      <div className="space-y-3 relative z-10">
        {/* Company Name */}
        <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
          {application.company_name}
        </h3>

        {/* Job Title */}
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate font-medium">
          {application.job_title}
        </p>

        {/* Date Applied */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          📅 {new Date(application.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Pending Suggestion Badge */}
        {hasPendingSuggestion && (
          <div className="pt-1">
            <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/60">
              ⚡ Suggestion Pending
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}
