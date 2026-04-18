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
      className="p-3 bg-slate-800 border border-slate-700 hover:border-blue-500 cursor-pointer relative transition-all duration-200 group hover:bg-slate-750"
      style={{ borderRadius: '8px' }}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors z-10"
          title={isArchived ? 'Permanently delete' : 'Move to trash'}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}

      {/* Company + Role */}
      <h3 className="font-bold text-sm text-white leading-tight pr-6">
        {application.company_name}
      </h3>
      <p className="text-xs text-slate-300 mt-0.5 mb-3">
        <span className="text-blue-400 font-semibold">{application.job_title}</span>
      </p>

      {/* Date Applied */}
      <p className="text-xs text-slate-500 mb-2">
        Applied {new Date(application.date_submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>

      {/* Primary metrics */}
      <div className="text-xs text-slate-300 font-medium flex flex-wrap gap-2 items-center mb-2">
        {application.employment_type && <span className="text-slate-400">{application.employment_type}</span>}
        {application.work_arrangement && <span className="text-slate-400">{application.work_arrangement}</span>}
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
      </div>

      {/* Hidden details - show on hover */}
      <div className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700 hidden group-hover:block space-y-2">
        {targetDisplay && (
          <div className="text-blue-400">🎯 Target: {targetDisplay}{isHourly ? '/hr' : ''}</div>
        )}
        {application.job_location && (
          <div className="text-slate-300">📍 {application.job_location}</div>
        )}
        {application.work_arrangement_notes && (
          <div className="text-slate-500">Details: {application.work_arrangement_notes}</div>
        )}
        {application.notes && (
          <div className="text-slate-400 italic">"{application.notes.substring(0, 80)}{application.notes.length > 80 ? '...' : ''}"</div>
        )}
        {application.company_website && (
          <div className="text-slate-500 truncate">Site: {application.company_website}</div>
        )}
        {onPrepClick && (
          <button
            onClick={handlePrepClick}
            className="w-full mt-2 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase transition-colors"
            style={{ borderRadius: '4px' }}
          >
            📚 Interview Prep
          </button>
        )}
      </div>
    </div>
  )
}
