'use client'
import { useEffect, useRef, useState } from 'react'
import type { Item } from '@/lib/db/types'
import { completeItems, uncompleteItems, updateItem, deleteItems } from '@/lib/db/mutations'

interface MetadataBadgesProps {
  metadata: Record<string, unknown>
}

function MetadataBadges({ metadata }: MetadataBadgesProps) {
  const entries = Object.entries(metadata)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([key, value]) => {
        const strValue = String(value)

        if (key === 'priority') {
          const cls = strValue === 'high' ? 'badge-high' : strValue === 'medium' ? 'badge-medium' : strValue === 'low' ? 'badge-low' : 'badge-default'
          return (
            <span key={key} className={`badge ${cls}`}>
              {strValue}
            </span>
          )
        }

        if (key === 'effort') {
          return (
            <span key={key} className="badge badge-default">
              <svg aria-hidden="true" className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {strValue}
            </span>
          )
        }

        return (
          <span key={key} className="badge badge-default">
            {key}: {strValue}
          </span>
        )
      })}
    </div>
  )
}

interface TodoItemProps {
  item: Item
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onToggleComplete?: () => void
  isCompleting?: boolean
  showDragHandle?: boolean
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onTouchStartDrag?: (e: React.TouchEvent<HTMLElement>) => void
}

export function TodoItem({ 
  item, 
  selectable, 
  selected, 
  onToggleSelect,
  onToggleComplete,
  isCompleting,
  showDragHandle,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragEnd,
  onTouchStartDrag
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const itemRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  const handleToggle = async () => {
    if (selectable && onToggleSelect) {
      onToggleSelect()
      return
    }
    if (onToggleComplete) {
      onToggleComplete()
      return
    }
    if (item.completed) {
      await uncompleteItems([item.id])
    } else {
      await completeItems([item.id])
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (selectable || isEditing) return
    const target = e.target as HTMLElement
    if (target.closest('[data-drag-handle]')) return
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || touchStartX.current === null) return
    const currentX = e.touches[0].clientX
    const diff = currentX - touchStartX.current
    setTranslateX(diff)
  }

  const handleTouchEnd = async () => {
    if (!isSwiping) return
    setIsSwiping(false)
    touchStartX.current = null

    const itemWidth = itemRef.current?.offsetWidth || 300
    const threshold = itemWidth * 0.4

    if (translateX > threshold) {
      if (!item.completed) {
        if (onToggleComplete) {
          onToggleComplete()
        } else {
          await completeItems([item.id])
        }
      }
      setTranslateX(0)
    } else if (translateX < -threshold) {
      await deleteItems([item.id])
      setTranslateX(0)
    } else {
      setTranslateX(0)
    }
  }

  const handleEditSave = async () => {
    if (editText.trim() !== item.text) {
      await updateItem(item.id, { text: editText.trim() })
    }
    setIsEditing(false)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      setEditText(item.text)
      setIsEditing(false)
    }
  }

  const isCompleted = item.completed && !selectable

  return (
    <section 
      className={`relative overflow-hidden border-b border-surface-100 dark:border-surface-800 animate-slide-in ${isDragging ? 'opacity-50 shadow-lg' : ''}`} 
      data-testid="todo-item"
      aria-label={item.text}
      draggable={showDragHandle}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
    >
      <div className={`absolute inset-0 flex items-center justify-between px-4 ${translateX > 0 ? 'bg-green-100 dark:bg-green-900/30' : translateX < 0 ? 'bg-red-100 dark:bg-red-900/30' : ''}`}>
        <div className={`text-green-600 dark:text-green-400 font-medium ${translateX > 0 ? 'opacity-100' : 'opacity-0'}`}>Complete</div>
        <div className={`text-red-600 dark:text-red-400 font-medium ${translateX < 0 ? 'opacity-100' : 'opacity-0'}`}>Delete</div>
      </div>

      <div
        ref={itemRef}
        className={`relative flex items-center gap-3 py-3 px-4 bg-white dark:bg-surface-900 transition-transform ${isSwiping ? '' : 'duration-200'} ${isCompleted ? 'opacity-60' : ''} ${isCompleting ? 'animate-complete-out' : ''}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={handleToggle}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center touch-target ${
            selectable
              ? selected
                ? 'bg-primary-500 border-primary-500'
                : 'border-surface-300 dark:border-surface-600'
              : item.completed
              ? 'bg-primary-500 border-primary-500'
              : 'border-surface-300 dark:border-surface-600'
          }`}
          style={{ minWidth: '44px', minHeight: '44px', margin: '-9px' }}
          aria-label={selectable ? (selected ? 'Deselect' : 'Select') : item.completed ? 'Mark incomplete' : 'Mark complete'}
          data-testid="todo-checkbox"
        >
          {(selectable ? selected : item.completed) && (
            <svg aria-hidden="true" className="w-3 h-3 text-white animate-check-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={handleEditKeyDown}
              className="input-base w-full text-base"
            />
          ) : (
            <button
              type="button"
              className={`w-full text-left text-base select-none-touch cursor-text ${isCompleted ? 'line-through text-surface-400 dark:text-surface-500' : 'text-surface-900 dark:text-surface-50'}`}
              onClick={() => !selectable && setIsEditing(true)}
              onKeyDown={e => { if (!selectable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setIsEditing(true) } }}
              tabIndex={selectable ? -1 : 0}
              aria-label={`Edit "${item.text}"`}
              data-testid="todo-text"
            >
              {item.text}
            </button>
          )}
          <MetadataBadges metadata={item.metadata} />
        </div>

        {showDragHandle && (
          <button
            type="button"
            data-drag-handle
            aria-label="Reorder item"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-surface-400 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={onTouchStartDrag}
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}
