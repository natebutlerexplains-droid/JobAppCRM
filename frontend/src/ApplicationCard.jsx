import { Trash2 } from 'lucide-react'

function formatSalary(val) {
  if (!val) return null
  return '$' + Number(val).toLocaleString()
}

export function ApplicationCard({ application, hasSuggestion, onClick, onDelete, isArchived, onPrepClick, isDragging }) {
  const handleDelete = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onDelete) onDelete(application.id)
  }

  const handlePrepClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onPrepClick) onPrepClick(application)
  }

  const isHourly = application.pay_type === 'Hourly'

  // Check if threshold hours have passed since submission and app is not in interview stage
  const getFollowUpIndicator = () => {
    const interviewStages = ['Phone Screening', '1st Round', '2nd Round', '3rd Round']
    if (interviewStages.includes(application.status) || application.status === 'Archived') {
      return null
    }
    const submittedDate = new Date(application.date_submitted)
    const now = new Date()
    const hoursPassed = (now - submittedDate) / (1000 * 60 * 60)
    const settings = JSON.parse(localStorage.getItem('app_settings')) || {}
    const threshold = settings.followUpThresholdHours || 48
    return hoursPassed >= threshold
  }

  const showFollowUp = getFollowUpIndicator()

  const salaryDisplay = (() => {
    if (!application.salary_min && !application.salary_max) return null
    if (application.salary_min && application.salary_max) {
      return `${formatSalary(application.salary_min)}–${formatSalary(application.salary_max)}`
    }
    return formatSalary(application.salary_min || application.salary_max)
  })()

  const targetDisplay = formatSalary(application.salary_negotiation_target)

  // Core trio required for Prep: company_name, job_title, job_url
  const hasCompanyName = !!application.company_name && application.company_name.trim() !== ''
  const hasJobTitle = !!application.job_title && application.job_title.trim() !== ''
  const hasJobUrl = !!application.job_url && application.job_url.trim() !== ''
  const canPrep = hasCompanyName && hasJobTitle && hasJobUrl

  return (
    <div
      onClick={onClick}
      className="p-3 bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer relative transition-all duration-200 group hover:bg-slate-750 hover:shadow-lg"
      style={{
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 -1px 2px rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-2 text-slate-500 hover:text-red-400 transition-colors z-10"
          title={isArchived ? 'Permanently delete' : 'Move to trash'}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Company + Role - centered */}
      <div className="text-center mb-3">
        <h3 className="font-bold text-sm text-white leading-tight">
          {application.company_name}
        </h3>
        <p className="text-xs text-blue-400 font-semibold">
          {application.job_title}
        </p>
      </div>

      {/* Two-column layout for main info - centered */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* Left column */}
        <div className="text-xs text-center space-y-1.5">
          <div>
            <span className="text-slate-500 block text-xs mb-0.5">Applied</span>
            <p className="text-slate-300 font-medium">
              {new Date(application.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-0.5">Type</span>
            <p className="text-slate-300 font-medium">{application.employment_type || '—'}</p>
          </div>
        </div>

        {/* Right column */}
        <div className="text-xs text-center space-y-1.5">
          <div>
            <span className="text-slate-500 block text-xs mb-0.5">Arrangement</span>
            <p className="text-slate-300 font-medium">{application.work_arrangement || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-0.5">Target</span>
            <p className="text-blue-400 font-semibold">
              {targetDisplay || <span className="text-slate-500 italic">—</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-1 flex-wrap">
        {hasSuggestion && (
          <span className="inline-block px-2 py-0.5 bg-blue-600/40 text-blue-300 text-xs font-bold" style={{ borderRadius: '4px' }}>
            ⚡ Suggestion
          </span>
        )}
        {showFollowUp && (
          <span className="inline-block px-2 py-0.5 bg-orange-600/40 text-orange-300 text-xs font-bold" style={{ borderRadius: '4px' }}>
            ⏰ Follow-up
          </span>
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

      {/* Mobile: always visible details */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700 block sm:hidden space-y-2">
        {application.job_location && (
          <div className="text-slate-300">📍 {application.job_location}</div>
        )}
        {application.work_arrangement_notes && (
          <div className="text-slate-500">Details: {application.work_arrangement_notes}</div>
        )}
        {application.notes && (
          <div className="text-slate-400 italic">"{application.notes.substring(0, 80)}{application.notes.length > 80 ? '...' : ''}"</div>
        )}
      </div>

      {/* Desktop: hover-only details */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700 hidden sm:group-hover:block space-y-2">
        {application.job_location && (
          <div className="text-slate-300">📍 {application.job_location}</div>
        )}
        {application.work_arrangement_notes && (
          <div className="text-slate-500">Details: {application.work_arrangement_notes}</div>
        )}
        {application.notes && (
          <div className="text-slate-400 italic">"{application.notes.substring(0, 80)}{application.notes.length > 80 ? '...' : ''}"</div>
        )}
      </div>
    </div>
  )
}
