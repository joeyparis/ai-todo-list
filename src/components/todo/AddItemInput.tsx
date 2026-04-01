'use client'
import { useState } from 'react'
import { addItems } from '@/lib/db/mutations'

interface AddItemInputProps {
  listId: string
}

export function AddItemInput({ listId }: AddItemInputProps) {
  const [value, setValue] = useState('')

  const handleAdd = async () => {
    const trimmed = value.trim()
    if (!trimmed) return
    await addItems(listId, [{ text: trimmed, metadata: {} }])
    setValue('')
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Add item..."
        className="flex-1 text-base border-none outline-none bg-transparent placeholder-gray-400"
        style={{ minHeight: '44px' }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!value.trim()}
        className="text-blue-500 font-medium text-sm disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        Add
      </button>
    </div>
  )
}
