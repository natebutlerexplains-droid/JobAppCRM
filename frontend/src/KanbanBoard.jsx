import { useState, useMemo, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateApplication, deleteApplication, reorderApplications } from './firestore'
import { ApplicationCard } from './ApplicationCard'
import { InterviewPrepModal } from './InterviewPrepModal'

const COLUMNS = [
  { id: 'Submitted', label: 'Submitted' },
  { id: 'Phone Screening', label: 'Phone Screening' },
  { id: '1st Round', label: '1st Round' },
  { id: '2nd Round', label: '2nd Round' },
  { id: '3rd Round', label: '3rd Round' },
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

function KanbanColumn({ column, items, suggestions, onCardClick, onDelete, onPrepClick, onNavToInterview, isOver, overPosition }) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: column.id,
    data: { type: 'Column', column }
  })
  const suggestionsMap = new Map(suggestions.map(s => [s.application_id, true]))

  return (
    <div className="flex flex-col gap-4 h-[800px] w-full">
      <div className="font-black text-xl uppercase pb-2 border-b-2 text-center text-white border-slate-600 flex items-center justify-center gap-2" style={{ letterSpacing: '1px' }}>
        <span>{column.label}</span>
        <span className="text-sm font-normal text-slate-400">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 p-4 overflow-y-auto transition-all duration-150 border-2 ${
          isOver ? 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/30' : 'bg-slate-800/30 border-slate-700'
        }`}
        style={{ borderRadius: '8px' }}
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {isOver && overPosition === 'top' && (
            <div className="h-1 bg-blue-400 mb-3 rounded" />
          )}
          {items.map((app, idx) => (
            <div key={app.id} className={idx > 0 ? 'mt-3' : ''}>
              <SortableCard
                id={app.id}
                application={app}
                hasSuggestion={suggestionsMap.has(app.id)}
                onClick={() => onCardClick(app)}
                onDelete={onDelete}
                isArchived={false}
                onPrepClick={onNavToInterview || onPrepClick}
              />
              {isOver && overPosition === 'between' && (
                <div className="h-1 bg-blue-400 mt-3 mb-3 rounded" />
              )}
            </div>
          ))}
          {isOver && overPosition === 'bottom' && (
            <div className="h-1 bg-blue-400 mt-3 rounded" />
          )}
        </SortableContext>
        {items.length === 0 && (
          <div className={`text-center text-sm py-8 ${isOver ? 'text-blue-400' : 'text-slate-500'}`}>
            {isOver ? 'Drop here' : 'No applications'}
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ applications, onCardClick, onApplicationsChange, onNavToInterview, userId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [prepModalApp, setPrepModalApp] = useState(null)
  const [showPrepModal, setShowPrepModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [overColumnId, setOverColumnId] = useState(null)
  const [overPosition, setOverPosition] = useState(null)
  const dragRef = useRef(null)

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

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
    dragRef.current = { startY: event.active.rect.initial?.top || 0 }
  }

  const handleDragOver = (event) => {
    const { over, active, delta } = event
    if (!over) {
      setOverColumnId(null)
      setOverPosition(null)
      return
    }

    // Resolve to a column id whether pointer is over column zone or a card inside it
    const directColumn = COLUMNS.some(col => col.id === over.id)
    const resolvedColumnId = directColumn
      ? over.id
      : COLUMNS.find(col => items[col.id]?.some(a => a.id === over.id))?.id
    if (resolvedColumnId) {
      setOverColumnId(resolvedColumnId)

      // Determine position within column based on delta movement
      if (delta && dragRef.current) {
        const threshold = 60
        if (delta.y < -threshold) {
          setOverPosition('top')
        } else if (delta.y > threshold) {
          setOverPosition('bottom')
        } else {
          setOverPosition('between')
        }
      } else {
        setOverPosition('between')
      }
    }
  }

  const handleDelete = async (appId) => {
    if (!userId) return
    const app = applications.find(a => a.id === appId)
    if (!app) return

    if (app.status === 'Archived') {
      if (!window.confirm('Permanently delete this application?')) return
      setLoading(true)
      try {
        await deleteApplication(userId, appId)
        onApplicationsChange(applications.filter(a => a.id !== appId))
      } catch (err) {
        setError(`Failed to delete: ${err.message}`)
      } finally {
        setLoading(false)
      }
    } else {
      setLoading(true)
      try {
        await updateApplication(userId, appId, { status: 'Archived' })
        onApplicationsChange(applications.map(a => a.id === appId ? { ...a, status: 'Archived' } : a))
      } catch (err) {
        setError(`Failed to archive: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDragEnd = async (event) => {
    if (!userId) return
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)
    setOverPosition(null)
    if (!over) return

    const activeAppId = active.id
    const app = applications.find(a => a.id === activeAppId)
    if (!app) return

    const directColumn = COLUMNS.some(col => col.id === over.id)
    const targetColumnId = directColumn
      ? over.id
      : COLUMNS.find(col => items[col.id]?.some(a => a.id === over.id))?.id
    if (!targetColumnId) return

    // Case 1: Moving to a different column
    if (app.status !== targetColumnId) {
      setLoading(true)
      try {
        await updateApplication(userId, activeAppId, { status: targetColumnId })
        onApplicationsChange(applications.map(a => a.id === activeAppId ? { ...a, status: targetColumnId } : a))
      } catch (err) {
        setError(`Failed to update: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    // Case 2: Reordering within the same column
    else if (!directColumn && over.id !== activeAppId) {
      const columnApps = items[targetColumnId] || []
      const activeIdx = columnApps.findIndex(a => a.id === activeAppId)
      const overIdx = columnApps.findIndex(a => a.id === over.id)

      if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
        const newOrder = arrayMove(columnApps, activeIdx, overIdx)
        const updates = newOrder.map((app, idx) => ({
          id: app.id,
          order_position: idx
        }))

        setLoading(true)
        try {
          await reorderApplications(userId, updates)
          const updated = applications.map(a => {
            const u = updates.find(up => up.id === a.id)
            return u ? { ...a, order_position: u.order_position } : a
          })
          onApplicationsChange(updated)
        } catch (err) {
          setError(`Failed to reorder: ${err.message}`)
        } finally {
          setLoading(false)
        }
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-6 pb-4 w-full">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={items[column.id] || []}
              suggestions={[]}
              onCardClick={onCardClick}
              onDelete={handleDelete}
              onPrepClick={(app) => { setPrepModalApp(app); setShowPrepModal(true) }}
              onNavToInterview={onNavToInterview}
              isOver={overColumnId === column.id}
              overPosition={overColumnId === column.id ? overPosition : null}
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
                hasSuggestion={false}
                onClick={() => onCardClick(app)}
                onDelete={handleDelete}
                isArchived={true}
                onPrepClick={onNavToInterview || ((app) => { setPrepModalApp(app); setShowPrepModal(true) })}
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
