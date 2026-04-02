'use client'
import { useState } from 'react'
import { useItems } from '@/lib/db/hooks'
import { TodoItem } from './TodoItem'
import { AddItemInput } from './AddItemInput'
import { completeItems, deleteItems, reorderItems } from '@/lib/db/mutations'

interface TodoPanelProps {
  listId: string
  goal?: string
}

export function TodoPanel({ listId, goal }: TodoPanelProps) {
  const items = useItems(listId)
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true)
  
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const [touchDragId, setTouchDragId] = useState<string | null>(null)
  const [touchDragOverId, setTouchDragOverId] = useState<string | null>(null)

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    setSelectedIds(new Set())
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return
    await completeItems(Array.from(selectedIds))
    setIsSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    await deleteItems(Array.from(selectedIds))
    setIsSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    if (!draggedId || draggedId === targetId || !items) return

    const activeItems = items.filter(item => !item.completed)
    const draggedIndex = activeItems.findIndex(i => i.id === draggedId)
    const targetIndex = activeItems.findIndex(i => i.id === targetId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    const newOrderedItems = [...activeItems]
    const [removed] = newOrderedItems.splice(draggedIndex, 1)
    newOrderedItems.splice(targetIndex, 0, removed)

    const newOrderedIds = newOrderedItems.map(i => i.id)
    await reorderItems(listId, newOrderedIds)
    setDraggedId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleTouchStartDrag = (_e: React.TouchEvent, id: string) => {
    setTouchDragId(id)
    document.body.style.overflow = 'hidden'
  }

  const handleTouchMoveDrag = (e: React.TouchEvent) => {
    if (!touchDragId) return
    const clientY = e.touches[0].clientY
    const element = document.elementFromPoint(e.touches[0].clientX, clientY)
    const itemElement = element?.closest('[data-id]')
    if (itemElement) {
      const id = itemElement.getAttribute('data-id')
      if (id && id !== touchDragOverId) {
        setTouchDragOverId(id)
      }
    }
  }

  const handleTouchEndDrag = async () => {
    document.body.style.overflow = ''
    if (!touchDragId || !touchDragOverId || touchDragId === touchDragOverId || !items) {
      setTouchDragId(null)
      setTouchDragOverId(null)
      return
    }

    const activeItems = items.filter(item => !item.completed)
    const draggedIndex = activeItems.findIndex(i => i.id === touchDragId)
    const targetIndex = activeItems.findIndex(i => i.id === touchDragOverId)
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrderedItems = [...activeItems]
      const [removed] = newOrderedItems.splice(draggedIndex, 1)
      newOrderedItems.splice(targetIndex, 0, removed)

      const newOrderedIds = newOrderedItems.map(i => i.id)
      await reorderItems(listId, newOrderedIds)
    }

    setTouchDragId(null)
    setTouchDragOverId(null)
  }

  if (items === undefined) {
    return (
      <div className="p-4 space-y-4" data-testid="todo-panel">
        <div className="h-12 skeleton rounded-lg w-full"></div>
        <div className="h-12 skeleton rounded-lg w-full"></div>
        <div className="h-12 skeleton rounded-lg w-full"></div>
      </div>
    )
  }

  const activeItems = items.filter(item => !item.completed)
  const completedItems = items.filter(item => item.completed)

  return (
    <div className="flex flex-col h-full relative bg-white dark:bg-surface-950" data-testid="todo-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-900">
        {goal ? (
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <circle cx="12" cy="12" r="6" strokeWidth={2} />
              <circle cx="12" cy="12" r="2" strokeWidth={2} />
            </svg>
            <span className="font-medium">Goal:</span> {goal}
          </div>
        ) : (
          <div />
        )}
        {items.length > 0 && (
          <button
            onClick={toggleSelectMode}
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            data-testid="bulk-select-btn"
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <svg className="w-16 h-16 text-primary-200 dark:text-primary-900 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            No items yet. Use the chat below to brain dump your tasks!
          </p>
        </div>
      ) : (
        <div 
          className="flex-1 overflow-y-auto"
          onTouchMove={touchDragId ? handleTouchMoveDrag : undefined}
          onTouchEnd={touchDragId ? handleTouchEndDrag : undefined}
        >
          {activeItems.map(item => (
            <div
              key={item.id}
              data-id={item.id}
              className={dragOverId === item.id || touchDragOverId === item.id ? 'border-t-2 border-primary-500' : ''}
            >
              <TodoItem
                item={item}
                selectable={isSelectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelection(item.id)}
                showDragHandle={!isSelectMode}
                isDragging={draggedId === item.id || touchDragId === item.id}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                onTouchStartDrag={(e) => handleTouchStartDrag(e, item.id)}
              />
            </div>
          ))}

          {completedItems.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm font-medium text-surface-500 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-900 transition-colors"
                data-testid="completed-section"
              >
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isCompletedExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Completed ({completedItems.length})
              </button>
              
              {isCompletedExpanded && (
                <div className="animate-slide-in">
                  {completedItems.map(item => (
                    <TodoItem
                      key={item.id}
                      item={item}
                      selectable={isSelectMode}
                      selected={selectedIds.has(item.id)}
                      onToggleSelect={() => toggleSelection(item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isSelectMode && selectedIds.size > 0 && (
        <div 
          className="absolute bottom-16 left-4 right-4 bg-surface-900 dark:bg-surface-50 text-white dark:text-surface-900 rounded-lg shadow-xl p-3 flex items-center justify-between animate-slide-in z-10"
          data-testid="bulk-action-bar"
        >
          <span className="text-sm font-medium px-2">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkComplete}
              className="px-3 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              Complete All
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-950">
        <AddItemInput listId={listId} />
      </div>
    </div>
  )
}
