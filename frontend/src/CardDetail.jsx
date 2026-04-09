import { useState, useEffect } from 'react'
import { getApplicationEmails, getApplicationInteractions, createInteraction, updateApplication, deleteApplication, formatDate } from './api'
import { AddInteraction } from './AddInteraction'

export function CardDetail({ application, isOpen, onClose }) {
  const [emails, setEmails] = useState([])
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('emails')
  const [showAddInteraction, setShowAddInteraction] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedFields, setEditedFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isOpen && application) {
      loadData()
    }
  }, [isOpen, application?.id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [emailsRes, interactionsRes] = await Promise.all([
        getApplicationEmails(application.id),
        getApplicationInteractions(application.id),
      ])
      setEmails(emailsRes.data || [])
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

  const statusOptions = ['Submitted', 'More Info Required', 'Interview Started', 'Denied', 'Offered']
  const currentStatus = editedFields.status ?? application.status

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => !isEditMode && onClose()}
      />

      {/* Centered Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-background border-b p-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {isEditMode ? (
                  <>
                    <input
                      type="text"
                      value={editedFields.company_name ?? application.company_name}
                      onChange={(e) => handleEditChange('company_name', e.target.value)}
                      className="w-full text-2xl font-bold bg-muted border rounded px-3 py-2 mb-3"
                      placeholder="Company name"
                    />
                    <input
                      type="text"
                      value={editedFields.job_title ?? application.job_title}
                      onChange={(e) => handleEditChange('job_title', e.target.value)}
                      className="w-full text-base bg-muted border rounded px-3 py-2"
                      placeholder="Job title"
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground">
                      {application.company_name}
                    </h2>
                    <p className="text-base text-muted-foreground mt-2">
                      {application.job_title}
                    </p>
                  </>
                )}
              </div>

              {/* Header Actions */}
              <div className="flex gap-2">
                {isEditMode ? (
                  <>
                    <button
                      onClick={handleSaveEdits}
                      disabled={saving}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 font-medium text-sm"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                      title="Edit application"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => !isEditMode && onClose()}
                      className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Metadata Section */}
            <div className="mt-6 space-y-3 text-sm">
              {/* Date Applied */}
              <div>
                <span className="text-muted-foreground">Applied: </span>
                <span className="text-foreground">
                  {formatDate(application.date_submitted)}
                </span>
              </div>

              {/* Status - Editable when in edit mode */}
              <div>
                <span className="text-muted-foreground">Status: </span>
                {isEditMode ? (
                  <select
                    value={currentStatus}
                    onChange={(e) => handleEditChange('status', e.target.value)}
                    className="ml-2 px-2 py-1 border rounded bg-muted text-foreground"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-foreground font-medium">{application.status}</span>
                )}
              </div>
            </div>

            {/* Prep Requirements Checklist - Only in Edit Mode */}
            {isEditMode && (
              <div className="mt-6 pt-6 border-t">
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground block mb-2 font-medium">Prep Requirements</label>
                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center gap-2 ${(editedFields.company_name ?? application.company_name) && (editedFields.company_name ?? application.company_name).trim() ? 'text-green-700' : 'text-muted-foreground'}`}>
                      <span className="text-lg">{(editedFields.company_name ?? application.company_name) && (editedFields.company_name ?? application.company_name).trim() ? '✓' : '○'}</span>
                      <span>Company name</span>
                    </div>
                    <div className={`flex items-center gap-2 ${(editedFields.job_title ?? application.job_title) && (editedFields.job_title ?? application.job_title).trim() ? 'text-green-700' : 'text-muted-foreground'}`}>
                      <span className="text-lg">{(editedFields.job_title ?? application.job_title) && (editedFields.job_title ?? application.job_title).trim() ? '✓' : '○'}</span>
                      <span>Position title</span>
                    </div>
                    <div className={`flex items-center gap-2 ${(editedFields.job_url ?? application.job_url) && (editedFields.job_url ?? application.job_url).trim() ? 'text-green-700' : 'text-muted-foreground'}`}>
                      <span className="text-lg">{(editedFields.job_url ?? application.job_url) && (editedFields.job_url ?? application.job_url).trim() ? '✓' : '○'}</span>
                      <span>Job posting URL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode: Additional Fields */}
            {isEditMode && (
              <div className="mt-6 space-y-4">
                {/* Job URL */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">Job URL</label>
                  <input
                    type="url"
                    value={editedFields.job_url ?? application.job_url ?? ''}
                    onChange={(e) => handleEditChange('job_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full text-sm bg-muted border rounded px-3 py-2"
                  />
                </div>

                {/* Salary Range */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-2 font-medium">Salary Range</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={editedFields.salary_min ?? application.salary_min ?? ''}
                        onChange={(e) => handleEditChange('salary_min', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Min"
                        className="w-full text-sm bg-muted border rounded px-3 py-2"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={editedFields.salary_max ?? application.salary_max ?? ''}
                        onChange={(e) => handleEditChange('salary_max', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Max"
                        className="w-full text-sm bg-muted border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Your Asking Price */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">Your Asking Price</label>
                  <input
                    type="number"
                    value={editedFields.salary_negotiation_target ?? application.salary_negotiation_target ?? ''}
                    onChange={(e) => handleEditChange('salary_negotiation_target', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Target salary"
                    className="w-full text-sm bg-muted border rounded px-3 py-2"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-medium">Notes</label>
                  <textarea
                    value={editedFields.notes ?? application.notes ?? ''}
                    onChange={(e) => handleEditChange('notes', e.target.value)}
                    placeholder="Add notes about this application..."
                    className="w-full text-sm bg-muted border rounded px-3 py-2 h-24 resize-none"
                  />
                </div>
              </div>
            )}

            {/* View Mode: Display Salary and Notes */}
            {!isEditMode && (
              <div className="mt-6 pt-6 border-t space-y-3 text-sm">
                {application.job_url && (
                  <div>
                    <span className="text-muted-foreground">Job URL: </span>
                    <a
                      href={application.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Posting
                    </a>
                  </div>
                )}
                {(application.salary_min || application.salary_max) && (
                  <div>
                    <span className="text-muted-foreground">Salary Range: </span>
                    <span className="text-foreground">
                      {application.salary_min && `$${application.salary_min.toLocaleString()}`}
                      {application.salary_min && application.salary_max ? ' – ' : ''}
                      {application.salary_max && `$${application.salary_max.toLocaleString()}`}
                    </span>
                  </div>
                )}
                {application.salary_negotiation_target && (
                  <div>
                    <span className="text-muted-foreground">Your Asking Price: </span>
                    <span className="text-foreground">
                      ${application.salary_negotiation_target.toLocaleString()}
                    </span>
                  </div>
                )}
                {application.notes && (
                  <div>
                    <span className="text-muted-foreground block mb-1">Notes:</span>
                    <p className="text-foreground text-sm whitespace-pre-wrap">{application.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b bg-muted/30 sticky top-32 z-40">
            <div className="flex gap-2 px-6">
              {['Emails', 'Interactions', 'Add Note'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    if (tab === 'Add Note') {
                      setShowAddInteraction(true)
                    } else {
                      setActiveTab(tab.toLowerCase())
                    }
                  }}
                  className={`py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.toLowerCase()
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded text-sm">
                {error}
              </div>
            )}

            {loading && !emails.length && !interactions.length && (
              <div className="text-center text-muted-foreground py-8">
                Loading...
              </div>
            )}

            {/* Emails Tab */}
            {activeTab === 'emails' && (
              <div className="space-y-3">
                {emails.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No emails linked to this application
                  </p>
                ) : (
                  emails.map(email => (
                    <div
                      key={email.id}
                      className="border rounded p-3 bg-card hover:bg-card/80 transition-colors"
                    >
                      <p className="font-medium text-sm text-foreground truncate">
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {email.sender}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(email.date_received)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Interactions Tab */}
            {activeTab === 'interactions' && (
              <div className="space-y-3">
                {interactions.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No interactions recorded
                  </p>
                ) : (
                  interactions.map(interaction => (
                    <div
                      key={interaction.id}
                      className="border-l-2 border-primary pl-3 py-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground capitalize">
                            {interaction.type.replace('_', ' ')}
                          </p>
                          {interaction.content && (
                            <p className="text-sm text-foreground mt-1">
                              {interaction.content}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(interaction.occurred_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer with Delete Button */}
          {!isEditMode && (
            <div className="border-t p-6 bg-muted/20 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:opacity-90 font-medium text-sm"
              >
                Delete Application
              </button>
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

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-background border rounded-lg p-6 max-w-sm">
                <h3 className="text-lg font-bold text-foreground mb-2">Delete Application?</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  This will permanently delete "{application.company_name}" and cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 font-medium text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:opacity-90 font-medium text-sm disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
