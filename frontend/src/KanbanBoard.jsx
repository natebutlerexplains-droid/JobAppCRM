import { useState, useCallback } from 'react'
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
import { updateApplication } from './api'

const COLUMNS = [
  { id: 'Submitted', label: 'Submitted' },
  { id: 'More Info Required', label: 'More Info Required' },
  { id: 'Interview Started', label: 'Interview Started' },
  { id: 'Denied', label: 'Denied' },
  { id: 'Offered', label: 'Offered' },
]

// Draggable card wrapper
function SortableCard({ id, application, hasSuggestion, onClick }) {
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
    transition,
    opacity: isDragging ? 0.5 : 1,
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
      />
    </div>
  )
}

// Column container
function KanbanColumn({ column, items, suggestions, onCardClick }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const suggestionsMap = new Map(suggestions.map(s => [s.application_id, true]))

  return (
    <div className="flex flex-col gap-4 min-h-[500px]">
      <h2 className="font-semibold text-lg text-foreground">{column.label}</h2>
      <div
        ref={setNodeRef}
        className="space-y-3 flex-1 bg-muted/30 rounded p-4 min-h-[450px]"
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(app => (
            <SortableCard
              key={app.id}
              id={app.id}
              application={app}
              hasSuggestion={suggestionsMap.has(app.id)}
              onClick={() => onCardClick(app)}
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
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

  // Update local state when applications change
  const handleDragEnd = async (event) => {
    const { active, over } = event

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
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-6 overflow-x-auto pb-4">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              items={items[column.id] || []}
              suggestions={suggestions}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {/* Drag overlay for visual feedback */}
        </DragOverlay>
      </DndContext>

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
