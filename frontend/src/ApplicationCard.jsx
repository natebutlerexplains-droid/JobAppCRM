import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from './api'

export function ApplicationCard({ application, hasSuggestion, onClick, onPrepClick }) {
  const hasPendingSuggestion = hasSuggestion === true

  // Core trio required for Prep: company_name, job_title, job_url
  const hasCompanyName = !!application.company_name && application.company_name.trim() !== ''
  const hasJobTitle = !!application.job_title && application.job_title.trim() !== ''
  const hasJobUrl = !!application.job_url && application.job_url.trim() !== ''
  const canPrep = hasCompanyName && hasJobTitle && hasJobUrl

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

        {/* Prep Button - Only enabled when all core trio fields are filled */}
        <div className="pt-2">
          <button
            onClick={handlePrepClick}
            disabled={!canPrep}
            className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
              canPrep
                ? 'bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={!canPrep ? 'Add company, position, and job link to prep' : 'Start interview prep'}
          >
            Prep → Interview Readiness
          </button>
          {!canPrep && (
            <p className="text-xs text-muted-foreground mt-1">
              Add company, position & link
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
