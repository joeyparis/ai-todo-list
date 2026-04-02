'use client'
import { useState, useRef } from 'react'
import { addItems } from '@/lib/db/mutations'

interface AddItemInputProps {
  listId: string
}

export function AddItemInput({ listId }: AddItemInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    await addItems(listId, [{ text: trimmed, metadata: {} }])
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div 
      className="flex items-center gap-2 px-4 py-3 border-t border-surface-200 dark:border-surface-700"
      data-testid="add-item-input"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Add item..."
        className="input-base flex-1 text-base border-none outline-none bg-transparent placeholder-surface-400 dark:placeholder-surface-500 dark:text-surface-50"
        style={{ minHeight: '44px' }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!value.trim()}
        data-testid="add-item-button"
        className="text-primary-500 font-medium text-sm disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center touch-target select-none-touch"
      >
        Add
      </button>
    </div>
  )
}
