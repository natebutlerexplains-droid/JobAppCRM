import { useState } from 'react'
import { useAuth } from './AuthContext'
import { createApplication } from './firestore'
import { X } from 'lucide-react'

export function NewApplicationForm({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    company_name: '',
    job_title: '',
    date_submitted: new Date().toISOString().split('T')[0],
    job_url: '',
    company_website: '',
    employment_type: '',
    pay_type: '',
    salary_min: '',
    salary_max: '',
    salary_negotiation_target: '',
    work_arrangement: '',
    work_arrangement_notes: '',
    job_location: '',
    notes: '',
    is_staffing: false,
    staffing_company_name: '',
    end_client_name: '',
    status: 'Submitted',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))

  const isHourly = formData.pay_type === 'Hourly'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!formData.company_name.trim()) { setError('Company name is required'); return }
    if (!formData.job_title.trim()) { setError('Job title is required'); return }
    if (!formData.date_submitted) { setError('Date applied is required'); return }

    setLoading(true)
    setError(null)
    try {
      const newApp = await createApplication(user.uid, {
        company_name: formData.company_name.trim(),
        job_title: formData.job_title.trim(),
        date_submitted: new Date(formData.date_submitted),
        job_url: formData.job_url || null,
        company_website: formData.company_website || null,
        employment_type: formData.employment_type || null,
        pay_type: formData.pay_type || null,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        salary_negotiation_target: formData.salary_negotiation_target ? parseFloat(formData.salary_negotiation_target) : null,
        work_arrangement: formData.work_arrangement || null,
        work_arrangement_notes: formData.work_arrangement_notes || null,
        job_location: formData.job_location || null,
        notes: formData.notes || null,
        is_staffing: formData.is_staffing || false,
        staffing_company_name: formData.staffing_company_name || null,
        end_client_name: formData.end_client_name || null,
        status: 'Submitted',
        order_position: 0,
      })
      setFormData({
        company_name: '', job_title: '', date_submitted: new Date().toISOString().split('T')[0],
        job_url: '', company_website: '', employment_type: '', pay_type: '',
        salary_min: '', salary_max: '', salary_negotiation_target: '',
        work_arrangement: '', work_arrangement_notes: '', job_location: '', notes: '',
        is_staffing: false, staffing_company_name: '', end_client_name: '', status: 'Submitted',
      })
      if (onSuccess) onSuccess(newApp)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create application')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = "w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500"

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '8px' }}>

          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-5 flex justify-between items-center">
            <h2 className="text-2xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
              New Application
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Company + Role */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Company Name *</label>
                <input type="text" value={formData.company_name} onChange={set('company_name')}
                  placeholder="e.g., Acme Corp" className={inputClass} style={{ borderRadius: '4px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Job Title *</label>
                <input type="text" value={formData.job_title} onChange={set('job_title')}
                  placeholder="e.g., Senior Engineer" className={inputClass} style={{ borderRadius: '0px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Date Applied *</label>
                <input type="date" value={formData.date_submitted} onChange={set('date_submitted')}
                  className={inputClass} style={{ borderRadius: '4px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Job URL <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input type="text" value={formData.job_url} onChange={set('job_url')}
                  placeholder="https://..." className={inputClass} style={{ borderRadius: '0px' }} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Company Website <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input type="text" value={formData.company_website} onChange={set('company_website')}
                  placeholder="https://www..." className={inputClass} style={{ borderRadius: '0px' }} />
              </div>
            </div>

            <div className="border-t border-slate-700 pt-5 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase">Work Arrangement</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Type</label>
                  <select value={formData.work_arrangement} onChange={set('work_arrangement')}
                    className={inputClass} style={{ borderRadius: '4px' }}>
                    <option value="">Not set</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-Site">On-Site</option>
                  </select>
                </div>
                {(formData.work_arrangement === 'Hybrid' || formData.work_arrangement === 'On-Site') && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Location</label>
                    <input type="text" value={formData.job_location} onChange={set('job_location')}
                      placeholder="e.g., Denver, CO or 123 Main St, Boston, MA" className={inputClass} style={{ borderRadius: '0px' }} />
                  </div>
                )}
                {formData.work_arrangement === 'Hybrid' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Details <span className="text-slate-600 normal-case font-normal">(e.g., "3 days office/2 remote")</span></label>
                    <input type="text" value={formData.work_arrangement_notes} onChange={set('work_arrangement_notes')}
                      placeholder="e.g., 3 days office / 2 remote" className={inputClass} style={{ borderRadius: '0px' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-5 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase">Compensation</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Employment Type</label>
                  <select value={formData.employment_type} onChange={set('employment_type')}
                    className={inputClass} style={{ borderRadius: '4px' }}>
                    <option value="">Not set</option>
                    <option value="W2">W2</option>
                    <option value="1099">1099</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Pay Type</label>
                  <select value={formData.pay_type} onChange={set('pay_type')}
                    className={inputClass} style={{ borderRadius: '4px' }}>
                    <option value="">Not set</option>
                    <option value="Salary">Salary</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>
              </div>

              {formData.pay_type && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                        {isHourly ? 'Min Rate ($/hr)' : 'Min Salary'}
                      </label>
                      <input type="number" value={formData.salary_min} onChange={set('salary_min')}
                        placeholder={isHourly ? '25' : '80000'} className={inputClass} style={{ borderRadius: '0px' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                        {isHourly ? 'Max Rate ($/hr)' : 'Max Salary'}
                      </label>
                      <input type="number" value={formData.salary_max} onChange={set('salary_max')}
                        placeholder={isHourly ? '45' : '130000'} className={inputClass} style={{ borderRadius: '0px' }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                      {isHourly ? 'My Target Rate ($/hr)' : 'My Target Salary'}
                    </label>
                    <input type="number" value={formData.salary_negotiation_target} onChange={set('salary_negotiation_target')}
                      placeholder={isHourly ? '40' : '110000'} className={inputClass} style={{ borderRadius: '0px' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-700 pt-5 space-y-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_staffing} onChange={(e) => setFormData({...formData, is_staffing: e.target.checked})}
                    className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-400 uppercase">Working with Staffing Company</span>
                </label>
              </div>

              {formData.is_staffing && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Staffing Company Name</label>
                    <input type="text" value={formData.staffing_company_name} onChange={set('staffing_company_name')}
                      placeholder="e.g., TrueBlue, Apex Group" className={inputClass} style={{ borderRadius: '0px' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">End Client Name</label>
                    <input type="text" value={formData.end_client_name} onChange={set('end_client_name')}
                      placeholder="Actual company/client name" className={inputClass} style={{ borderRadius: '0px' }} />
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-700 pt-5">
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Notes <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
              <textarea value={formData.notes} onChange={set('notes')}
                placeholder="Any additional notes about this opportunity..." rows="3"
                className={inputClass} style={{ borderRadius: '0px' }} />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-300 text-sm">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-sm transition-colors disabled:opacity-50" style={{ borderRadius: '4px' }}>
                {loading ? 'Creating...' : '+ Add Application'}
              </button>
              <button type="button" onClick={onClose}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors" style={{ borderRadius: '4px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
