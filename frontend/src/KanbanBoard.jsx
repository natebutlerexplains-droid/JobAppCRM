import { useState, useCallback, useEffect } from 'react'
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
  arrayMove,
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
  { id: 'Archived', label: 'Trash', isTrash: true },
]

// Draggable card wrapper
function SortableCard({ id, application, hasSuggestion, onClick, onDelete, isArchived, onPrepClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
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

// Draggable card overlay (shown while dragging)
function DraggingCardOverlay({ application, hasSuggestion }) {
  return (
    <div className="transform scale-105 drop-shadow-2xl">
      <ApplicationCard
        application={application}
        hasSuggestion={hasSuggestion}
        isDragging={true}
      />
    </div>
  )
}

// Column container
function KanbanColumn({ column, items, suggestions, onCardClick, onDelete, onPrepClick }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const suggestionsMap = new Map(suggestions.map(s => [s.application_id, true]))
  const isArchived = column.isTrash

  return (
    <div className="flex flex-col gap-8 min-h-[600px] w-full">
      <div className={`font-black text-xl uppercase flex items-center gap-3 pb-4 border-b-2 truncate ${
        isArchived
          ? 'text-red-500 border-red-500'
          : 'text-white border-slate-600'
      }`} style={{ letterSpacing: '1px' }}>
        {column.label}
        <span className="ml-auto text-slate-500 font-normal text-sm lowercase whitespace-nowrap" style={{ letterSpacing: '0px' }}>{items.length} items</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-4 flex-1 p-6 min-h-[500px] transition-colors duration-200 border ${
          isArchived
            ? 'bg-slate-800/40 border-red-900/50'
            : 'bg-slate-800/30 border-slate-700'
        }`}
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
              isArchived={isArchived}
              onPrepClick={onPrepClick}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            No applications
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ applications, suggestions, onCardClick, onApplicationsChange }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [prepModalApp, setPrepModalApp] = useState(null)
  const [showPrepModal, setShowPrepModal] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 5,
      delay: 50,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group applications by status
  const columnItems = useCallback(() => {
    const grouped = {}
    COLUMNS.forEach(col => {
      grouped[col.id] = applications.filter(app => app.status === col.id)
    })
    return grouped
  }, [applications])

  const [items, setItems] = useState(columnItems())

  // Sync items when applications change
  useEffect(() => {
    setItems(columnItems())
  }, [applications, columnItems])

  // Track drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  // Handle delete/archive
  const handleDelete = async (appId) => {
    const app = applications.find(a => a.id === appId)
    if (!app) return

    const newStatus = app.status === 'Archived' ? null : 'Archived'

    if (!newStatus) {
      // Permanently delete archived items
      if (!window.confirm('Permanently delete this application?')) return
    }

    const previousItems = { ...items }
    const newItems = { ...items }

    // Remove from old column
    newItems[app.status] = newItems[app.status].filter(a => a.id !== appId)

    // Add to new column if not deleting
    if (newStatus) {
      newItems[newStatus] = [...(newItems[newStatus] || []), { ...app, status: newStatus }]
    }

    setItems(newItems)
    setLoading(true)
    setError(null)

    try {
      if (newStatus) {
        // Archive the item
        await updateApplication(appId, { status: newStatus })
        const updatedApps = applications.map(a =>
          a.id === appId ? { ...a, status: newStatus } : a
        )
        onApplicationsChange(updatedApps)
      } else {
        // Permanently delete
        await deleteApplication(appId)
        const updatedApps = applications.filter(a => a.id !== appId)
        onApplicationsChange(updatedApps)
      }
    } catch (err) {
      setItems(previousItems)
      setError(`Failed to delete application: ${err.message}`)
      console.error('Error deleting application:', err)
    } finally {
      setLoading(false)
    }
  }

  // Update local state when applications change
  const handleDragEnd = async (event) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) return

    const activeAppId = active.id
    const overColumnId = over.id

    // Find the application being dragged
    const app = applications.find(a => a.id === activeAppId)
    if (!app) return

    // If dropped on a column, update status
    if (COLUMNS.some(col => col.id === overColumnId)) {
      const newStatus = overColumnId
      if (app.status === newStatus) return

      // Optimistic update
      const previousItems = { ...items }
      const newItems = { ...items }

      // Remove from old column
      const oldColumn = app.status
      newItems[oldColumn] = newItems[oldColumn].filter(a => a.id !== activeAppId)

      // Add to new column
      newItems[newStatus] = [...newItems[newStatus], { ...app, status: newStatus }]

      setItems(newItems)
      setLoading(true)
      setError(null)

      try {
        // Update backend
        await updateApplication(activeAppId, { status: newStatus })

        // Notify parent
        const updatedApps = applications.map(a =>
          a.id === activeAppId ? { ...a, status: newStatus } : a
        )
        onApplicationsChange(updatedApps)
      } catch (err) {
        // Revert on error
        setItems(previousItems)
        setError(`Failed to update application: ${err.message}`)
        console.error('Error updating application:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded text-sm">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-6 gap-6 overflow-x-auto pb-4 w-full">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={items[column.id] || []}
              suggestions={suggestions}
              onCardClick={onCardClick}
              onDelete={handleDelete}
              onPrepClick={(app) => {
                setPrepModalApp(app)
                setShowPrepModal(true)
              }}
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

      {/* Interview Prep Modal */}
      <InterviewPrepModal
        application={prepModalApp}
        isOpen={showPrepModal}
        onClose={() => {
          setShowPrepModal(false)
          setPrepModalApp(null)
        }}
      />

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-background p-4 rounded shadow-lg">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      )}
    </div>
  )
}
