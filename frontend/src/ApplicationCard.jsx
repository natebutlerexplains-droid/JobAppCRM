import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from './api'

export function ApplicationCard({ application, hasSuggestion, onClick, onPrepClick }) {
  const hasPendingSuggestion = hasSuggestion === true
  const hasJobUrl = !!application.job_url

  const handlePrepClick = (e) => {
    e.stopPropagation()
    if (onPrepClick) {
      onPrepClick(application)
    }
  }

  return (
    <Card
      onClick={onClick}
      className="p-4 bg-card hover:bg-card/80 hover:shadow-md transition-all cursor-pointer border"
    >
      <div className="space-y-2">
        {/* Company Name */}
        <h3 className="font-semibold text-foreground truncate">
          {application.company_name}
        </h3>

        {/* Job Title */}
        <p className="text-sm text-muted-foreground truncate">
          {application.job_title}
        </p>

        {/* Date Applied */}
        <p className="text-xs text-muted-foreground">
          Applied: {formatDate(application.date_submitted)}
        </p>

        {/* Pending Suggestion Badge */}
        {hasPendingSuggestion && (
          <div className="pt-1">
            <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
              Suggestion Pending
            </Badge>
          </div>
        )}

        {/* Prep Button - Only show when job_url is set */}
        {hasJobUrl && (
          <div className="pt-2">
            <button
              onClick={handlePrepClick}
              className="w-full px-3 py-2 text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
            >
              Prep → Interview Readiness
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
