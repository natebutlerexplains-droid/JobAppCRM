import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ApplicationCard({ application, hasSuggestion, onClick }) {
  const hasPendingSuggestion = hasSuggestion === true

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
          Applied: {new Date(application.date_submitted).toLocaleDateString()}
        </p>

        {/* Pending Suggestion Badge */}
        {hasPendingSuggestion && (
          <div className="pt-1">
            <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
              Suggestion Pending
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}
