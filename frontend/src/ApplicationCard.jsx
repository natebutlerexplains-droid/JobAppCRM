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

  // Check if 48 hours have passed since submission and app is not in interview stage
  const getFollowUpIndicator = () => {
    if (application.status === 'Interview Started' || application.status === 'Denied' || application.status === 'Offered' || application.status === 'Archived') {
      return null
    }
    const submittedDate = new Date(application.date_submitted)
    const now = new Date()
    const hoursPassed = (now - submittedDate) / (1000 * 60 * 60)
    return hoursPassed >= 48
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

  return (
    <div
      onClick={onClick}
      className="p-5 bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer relative transition-colors duration-200 flex flex-col"
      style={{ borderRadius: '0px', minHeight: '220px' }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 transition-colors z-10"
          title={isArchived ? 'Permanently delete' : 'Move to trash'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Company — Role */}
      <div className="pr-8 mb-3">
        <h3 className="font-black text-base leading-tight text-white" style={{ letterSpacing: '0.5px' }}>
          {application.company_name}
        </h3>
        <p className="text-sm text-slate-300 font-medium mt-0.5 leading-tight">
          {application.job_title}
        </p>
      </div>

      {/* Date Applied */}
      <p className="text-xs text-slate-500 mb-3">
        Applied {new Date(application.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>

      {/* Compensation row */}
      {(salaryDisplay || application.employment_type || application.pay_type) && (
        <div className="mb-2 space-y-1">
          {salaryDisplay && (
            <p className="text-xs text-slate-300 font-medium">
              💰 {salaryDisplay}
              {application.pay_type && <span className="text-slate-500 ml-1">/ {isHourly ? 'hr' : 'yr'}</span>}
            </p>
          )}
          {targetDisplay && (
            <p className="text-xs text-blue-400 font-medium">
              🎯 Target: {targetDisplay}{isHourly ? '/hr' : ''}
            </p>
          )}
        </div>
      )}

      {/* Employment type + Work arrangement */}
      <div className="mb-3 space-y-1">
        {application.employment_type && (
          <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase border border-slate-600 text-slate-400 mr-1" style={{ letterSpacing: '0.5px' }}>
            {application.employment_type}
          </span>
        )}
        {application.work_arrangement && (
          <span className="inline-block px-2 py-0.5 text-xs font-bold uppercase border border-slate-600 text-slate-400" style={{ letterSpacing: '0.5px' }}>
            {application.work_arrangement === 'Hybrid' && application.work_arrangement_notes ? `${application.work_arrangement} (${application.work_arrangement_notes})` : application.work_arrangement}
          </span>
        )}
      </div>

      {/* Suggestion badge */}
      <div className="mb-2 flex gap-2 flex-wrap">
        {hasSuggestion && (
          <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-bold uppercase" style={{ borderRadius: '4px' }}>
            ⚡ Suggestion
          </span>
        )}
        {showFollowUp && (
          <span className="inline-block px-2 py-0.5 bg-orange-600 text-white text-xs font-bold uppercase" style={{ borderRadius: '4px' }}>
            ⏰ Follow-up
          </span>
        )}
      </div>

    </div>
  )
}
