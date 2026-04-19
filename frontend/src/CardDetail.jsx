import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { updateApplication } from './firestore'
import { AddInteraction } from './AddInteraction'
import { X } from 'lucide-react'

const STATUSES = ['Submitted', 'Phone Screening', '1st Round', '2nd Round', '3rd Round', 'Archived']
const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-Site']

function fmt(val) {
  if (!val) return '—'
  return '$' + Number(val).toLocaleString()
}

export function CardDetail({ application, isOpen, onClose, onSave, onNavToInterview = () => {} }) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (application) {
      setEditData({ ...application })
    }
  }, [application])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      await updateApplication(user.uid, application.id, editData)
      setIsEditing(false)
      if (onSave) onSave()
    } catch (err) {
      setError(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEditChange = (field, value) => {
    setEditedFields(prev => ({
      ...prev,
      [field]: value === '' ? null : value
    }))
  }

  const handleSaveEdits = async () => {
    setSaving(true)
    try {
      await updateApplication(application.id, editedFields)
      setIsEditMode(false)
      setEditedFields({})
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save changes')
      console.error('Error saving changes:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setEditedFields({})
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteApplication(application.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to delete application')
      console.error('Error deleting application:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen || !application) return null

  const isHourly = editData.pay_type === 'Hourly'

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '0px' }}>

          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 sm:p-6 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
                {isEditing ? 'Edit Application' : application.company_name}
              </h2>
              {!isEditing && (
                <p className="text-slate-400 text-sm mt-1">{application.job_title} • {application.status}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 text-sm">{error}</div>
            )}

            {isEditing ? (
              /* ── EDIT MODE ── */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Company Name</label>
                    <input type="text" value={editData.company_name || ''} onChange={e => setEditData({...editData, company_name: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Job Title</label>
                    <input type="text" value={editData.job_title || ''} onChange={e => setEditData({...editData, job_title: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Job URL</label>
                    <input type="text" value={editData.job_url || ''} onChange={e => setEditData({...editData, job_url: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Company Website</label>
                    <input type="text" value={editData.company_website || ''} onChange={e => setEditData({...editData, company_website: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div className="col-span-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={editData.is_staffing || false} onChange={e => setEditData({...editData, is_staffing: e.target.checked})}
                        className="w-4 h-4" />
                      <span className="text-xs font-bold text-slate-400 uppercase">Working with Staffing Company</span>
                    </label>
                  </div>

                  {editData.is_staffing && (
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Staffing Company Name</label>
                      <input type="text" value={editData.staffing_company_name || ''} onChange={e => setEditData({...editData, staffing_company_name: e.target.value})}
                        placeholder="e.g., TrueBlue, Apex Group"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                    </div>
                  )}

                  {editData.is_staffing && (
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">End Client Name</label>
                      <input type="text" value={editData.end_client_name || ''} onChange={e => setEditData({...editData, end_client_name: e.target.value})}
                        placeholder="Actual company/client name"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Status</label>
                    <select value={editData.status || ''} onChange={e => setEditData({...editData, status: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Employment Type</label>
                    <select value={editData.employment_type || ''} onChange={e => setEditData({...editData, employment_type: e.target.value || null})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }}>
                      <option value="">Not set</option>
                      <option value="W2">W2</option>
                      <option value="1099">1099</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Pay Type</label>
                    <select value={editData.pay_type || ''} onChange={e => setEditData({...editData, pay_type: e.target.value || null})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }}>
                      <option value="">Not set</option>
                      <option value="Salary">Salary</option>
                      <option value="Hourly">Hourly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Work Arrangement</label>
                    <select value={editData.work_arrangement || ''} onChange={e => setEditData({...editData, work_arrangement: e.target.value || null})}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }}>
                      <option value="">Not set</option>
                      {WORK_ARRANGEMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {editData.work_arrangement === 'Hybrid' && (
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Hybrid Details</label>
                      <input type="text" value={editData.work_arrangement_notes || ''} onChange={e => setEditData({...editData, work_arrangement_notes: e.target.value})}
                        placeholder="e.g., 3 days office / 2 remote" className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Notes</label>
                    <textarea value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})}
                      placeholder="Any additional notes about this opportunity..." rows="3"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isHourly ? 'Min Hourly Rate' : 'Salary Min'}</label>
                    <input type="number" value={editData.salary_min || ''} onChange={e => setEditData({...editData, salary_min: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder={isHourly ? '25' : '80000'}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isHourly ? 'Max Hourly Rate' : 'Salary Max'}</label>
                    <input type="number" value={editData.salary_max || ''} onChange={e => setEditData({...editData, salary_max: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder={isHourly ? '45' : '120000'}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isHourly ? 'Target Hourly Rate' : 'Target Salary'}</label>
                    <input type="number" value={editData.salary_negotiation_target || ''} onChange={e => setEditData({...editData, salary_negotiation_target: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder={isHourly ? '40' : '110000'}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm" style={{ borderRadius: '0px' }} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50" style={{ borderRadius: '0px' }}>
                    {saving ? 'Saving...' : '✓ Save Changes'}
                  </button>
                  <button onClick={() => { setIsEditing(false); setEditData({ ...application }) }}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors" style={{ borderRadius: '0px' }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* ── VIEW MODE ── */
              <div className="space-y-6">
                {/* Info block */}
                <div className="bg-slate-800/50 border border-slate-700 p-5 space-y-2.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Company</span><span className="text-white font-medium">{application.company_name}</span></div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Position</span><span className="text-white font-medium">{application.job_title}</span></div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Status</span><span className="text-white font-medium">{application.status}</span></div>
                  <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Applied</span><span className="text-white font-medium">{new Date(application.date_submitted).toLocaleDateString()}</span></div>
                  {application.employment_type && (
                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Type</span><span className="text-white font-medium">{application.employment_type}</span></div>
                  )}
                  {application.pay_type && (
                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Pay</span><span className="text-white font-medium">{application.pay_type}</span></div>
                  )}
                  {(application.salary_min || application.salary_max) && (
                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5">
                      <span className="text-slate-400">Range</span>
                      <span className="text-white font-medium">
                        {application.salary_min && application.salary_max
                          ? `${fmt(application.salary_min)} – ${fmt(application.salary_max)}`
                          : fmt(application.salary_min || application.salary_max)}
                        {application.pay_type === 'Hourly' ? '/hr' : ''}
                      </span>
                    </div>
                  )}
                  {application.salary_negotiation_target && (
                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5"><span className="text-slate-400">Target</span><span className="text-blue-400 font-medium">{fmt(application.salary_negotiation_target)}{application.pay_type === 'Hourly' ? '/hr' : ''}</span></div>
                  )}
                  {application.job_url && (
                    <div className="flex justify-between border-t border-slate-700/50 pt-2.5">
                      <span className="text-slate-400">Job URL</span>
                      <a href={application.job_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">View listing →</a>
                    </div>
                  )}
                  {application.is_staffing && (
                    <>
                      <div className="flex justify-between border-t border-slate-700/50 pt-2.5">
                        <span className="text-slate-400">Type</span>
                        <span className="text-white font-medium">Staffing Company</span>
                      </div>
                      {application.staffing_company_name && (
                        <div className="flex justify-between border-t border-slate-700/50 pt-2.5">
                          <span className="text-slate-400">Staffing Company</span>
                          <span className="text-white font-medium">{application.staffing_company_name}</span>
                        </div>
                      )}
                      {application.end_client_name && (
                        <div className="flex justify-between border-t border-slate-700/50 pt-2.5">
                          <span className="text-slate-400">End Client</span>
                          <span className="text-white font-medium">{application.end_client_name}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button onClick={() => setIsEditing(true)}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors" style={{ borderRadius: '0px' }}>
                    ✎ Edit
                  </button>
                  <button onClick={() => onNavToInterview(application)}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors" style={{ borderRadius: '0px' }}>
                    📚 Interview Prep
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
