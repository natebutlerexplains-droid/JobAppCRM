import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ApplicationCard } from './ApplicationCard'
import { InterviewPrepModal } from './InterviewPrepModal'
import { updateApplication, deleteApplication } from './api'

const COLUMNS = [
  { id: 'Submitted', label: 'Submitted' },
  { id: 'More Info Required', label: 'More Info Required' },
  { id: 'Interview Started', label: 'Interview Started' },
  { id: 'Denied', label: 'Denied' },
  { id: 'Offered', label: 'Offered' },
]

function SortableCard({ id, application, hasSuggestion, onClick, onDelete, isArchived, onPrepClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <ApplicationCard
        application={application}
        hasSuggestion={hasSuggestion}
        onClick={onClick}
        onDelete={onDelete}
        isArchived={isArchived}
        onPrepClick={onPrepClick}
      />
    </div>
  )
}

function DraggingCardOverlay({ application, hasSuggestion }) {
  return (
    <div className="transform scale-105 drop-shadow-2xl">
      <ApplicationCard application={application} hasSuggestion={hasSuggestion} isDragging={true} />
    </div>
  )
}

function KanbanColumn({ column, items, suggestions, onCardClick, onDelete, onPrepClick }) {
  const { setNodeRef } = useSortable({ id: column.id, data: { type: 'Column', column } })
  const suggestionsMap = new Map(suggestions.map(s => [s.application_id, true]))

  return (
    <div className="flex flex-col gap-8 min-h-[600px] w-full">
      <div className="font-black text-xl uppercase pb-4 border-b-2 text-center text-white border-slate-600" style={{ letterSpacing: '1px' }}>
        {column.label}
      </div>
      <div
        ref={setNodeRef}
        className="space-y-4 flex-1 p-6 min-h-[500px] transition-colors duration-200 border bg-slate-800/30 border-slate-700"
        style={{ borderRadius: '0px' }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(app => (
            <SortableCard
              key={app.id}
              id={app.id}
              application={app}
              hasSuggestion={suggestionsMap.has(app.id)}
              onClick={() => onCardClick(app)}
              onDelete={onDelete}
              isArchived={false}
              onPrepClick={onPrepClick}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">No applications</div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ applications, suggestions, onCardClick, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [prepModalApp, setPrepModalApp] = useState(null)
  const [showPrepModal, setShowPrepModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Fully derived from applications prop — no local state, no sync issues
  const items = useMemo(() => {
    const grouped = {}
    COLUMNS.forEach(col => {
      grouped[col.id] = applications.filter(a => a.status === col.id)
    })
    grouped['Archived'] = applications.filter(a => a.status === 'Archived')
    return grouped
  }, [applications])

  const handleDragStart = (event) => setActiveId(event.active.id)

  const handleDelete = async (appId) => {
    const app = applications.find(a => a.id === appId)
    if (!app) return

    if (app.status === 'Archived') {
      if (!window.confirm('Permanently delete this application?')) return
      setLoading(true)
      try {
        await deleteApplication(appId)
        onRefresh()
      } catch (err) {
        setError(`Failed to delete: ${err.message}`)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        await updateApplication(appId, { status: 'Archived' })
        onRefresh()
      } catch (err) {
        setError(`Failed to archive: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeAppId = active.id
    const overColumnId = over.id
    const app = applications.find(a => a.id === activeAppId)
    if (!app) return

    if (COLUMNS.some(col => col.id === overColumnId) && app.status !== overColumnId) {
      setLoading(true)
      try {
        await updateApplication(activeAppId, { status: overColumnId })
        onRefresh()
      } catch (err) {
        setError(`Failed to update: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-6 pb-4 w-full">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={items[column.id] || []}
              suggestions={suggestions}
              onCardClick={onCardClick}
              onDelete={handleDelete}
              onPrepClick={(app) => { setPrepModalApp(app); setShowPrepModal(true) }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeId && applications.find(a => a.id === activeId) && (
            <DraggingCardOverlay
              application={applications.find(a => a.id === activeId)}
              hasSuggestion={suggestions.some(s => s.application_id === activeId)}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Archived Section */}
      <div className="mt-12 border-t border-slate-700 pt-8">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="w-full px-6 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white font-bold uppercase transition-colors flex items-center justify-between"
          style={{ borderRadius: '0px' }}
        >
          <span>{showArchived ? '▼' : '▶'} Archived Items</span>
          <span className="text-slate-400 text-sm font-normal">{items['Archived']?.length || 0}</span>
        </button>

        {showArchived && (
          <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {(items['Archived'] || []).map(app => (
              <ApplicationCard
                key={app.id}
                application={app}
                hasSuggestion={suggestions.some(s => s.application_id === app.id)}
                onClick={() => onCardClick(app)}
                onDelete={handleDelete}
                isArchived={true}
                onPrepClick={(app) => { setPrepModalApp(app); setShowPrepModal(true) }}
              />
            ))}
          </div>
        )}

        {showArchived && (items['Archived']?.length === 0) && (
          <div className="text-center text-slate-400 py-8">No archived items</div>
        )}
      </div>

      <InterviewPrepModal
        application={prepModalApp}
        isOpen={showPrepModal}
        onClose={() => { setShowPrepModal(false); setPrepModalApp(null) }}
      />

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-slate-900 border border-slate-700 p-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      )}
    </div>
  )
}
