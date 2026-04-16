import { useState, useEffect } from 'react'
import { getApplicationInteractions, createInteraction, updateApplication } from './api'
import { AddInteraction } from './AddInteraction'
import { X } from 'lucide-react'

export function CardDetail({ application, isOpen, onClose, onSave }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && application) {
      loadData()
      setEditData(application)
    }
  }, [isOpen, application?.id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const interactionsRes = await getApplicationInteractions(application.id)
      setInteractions(interactionsRes.data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error loading card detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddInteraction = async (data) => {
    try {
      await createInteraction(application.id, data)
      await loadData()
      setShowAddInteraction(false)
    } catch (err) {
      console.error('Error adding interaction:', err)
      throw err
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateApplication(application.id, editData)
      setIsEditing(false)
      if (onSave) {
        onSave()
      }
    } catch (err) {
      setError(`Failed to save: ${err.message}`)
      console.error('Error saving application:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !application) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderRadius: '0px' }}>
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-8 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black uppercase text-white" style={{ letterSpacing: '1px' }}>
                {isEditing ? 'Edit Application' : 'Application Details'}
              </h2>
              {!isEditing && <p className="text-slate-400 text-sm mt-2">{application.company_name} • {application.job_title}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-300 p-4 rounded">
                {error}
              </div>
            )}

            {isEditing ? (
              // Edit Mode
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase">Company Name</label>
                  <input
                    type="text"
                    value={editData.company_name || ''}
                    onChange={(e) => setEditData({...editData, company_name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                    style={{ borderRadius: '0px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase">Job Title</label>
                  <input
                    type="text"
                    value={editData.job_title || ''}
                    onChange={(e) => setEditData({...editData, job_title: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                    style={{ borderRadius: '0px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase">Job URL</label>
                  <input
                    type="text"
                    value={editData.job_url || ''}
                    onChange={(e) => setEditData({...editData, job_url: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                    style={{ borderRadius: '0px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase">Status</label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                    style={{ borderRadius: '0px' }}
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="More Info Required">More Info Required</option>
                    <option value="Interview Started">Interview Started</option>
                    <option value="Denied">Denied</option>
                    <option value="Offered">Offered</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase">Salary Min</label>
                    <input
                      type="number"
                      value={editData.salary_min || ''}
                      onChange={(e) => setEditData({...editData, salary_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-white mb-2 uppercase">Salary Max</label>
                    <input
                      type="number"
                      value={editData.salary_max || ''}
                      onChange={(e) => setEditData({...editData, salary_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                      style={{ borderRadius: '0px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2 uppercase">Salary Target</label>
                  <input
                    type="number"
                    value={editData.salary_negotiation_target || ''}
                    onChange={(e) => setEditData({...editData, salary_negotiation_target: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded"
                    style={{ borderRadius: '0px' }}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors disabled:opacity-50"
                    style={{ borderRadius: '0px' }}
                  >
                    {saving ? 'Saving...' : '✓ Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
                    style={{ borderRadius: '0px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-6">
                <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Company:</span>
                    <span className="text-white font-medium">{application.company_name}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-400">Position:</span>
                    <span className="text-white font-medium">{application.job_title}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-white font-medium">{application.status}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-3">
                    <span className="text-slate-400">Applied:</span>
                    <span className="text-white font-medium">{new Date(application.date_submitted).toLocaleDateString()}</span>
                  </div>
                </div>

                {(application.salary_min || application.salary_max) && (
                  <div className="bg-slate-800/50 border border-slate-700 p-6 space-y-2">
                    <p className="text-slate-300">Range: ${application.salary_min?.toLocaleString()} - ${application.salary_max?.toLocaleString()}</p>
                    {application.salary_negotiation_target && (
                      <p className="text-blue-400">Target: ${application.salary_negotiation_target?.toLocaleString()}</p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  ✎ Edit Application
                </button>

                <button
                  onClick={() => setShowAddInteraction(true)}
                  className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase transition-colors"
                  style={{ borderRadius: '0px' }}
                >
                  + Add Interaction
                </button>

                {/* Interactions */}
                <div>
                  <h3 className="font-bold text-white uppercase text-sm mb-4" style={{ letterSpacing: '0.5px' }}>Interactions</h3>
                  <div className="space-y-3">
                    {interactions.length === 0 ? (
                      <p className="text-slate-400 text-sm py-4 text-center">No interactions recorded yet</p>
                    ) : (
                      interactions.map(interaction => (
                        <div key={interaction.id} className="bg-slate-800/30 border-l-4 border-blue-500 pl-4 py-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-white capitalize">
                                {interaction.type.replace('_', ' ')}
                              </p>
                              {interaction.content && (
                                <p className="text-sm text-slate-300 mt-1">{interaction.content}</p>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 whitespace-nowrap">{new Date(interaction.occurred_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Interaction Modal */}
            {showAddInteraction && (
              <AddInteraction
                appId={application.id}
                onClose={() => setShowAddInteraction(false)}
                onSubmit={handleAddInteraction}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
