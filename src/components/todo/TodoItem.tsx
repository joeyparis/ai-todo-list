'use client'
import type { Item } from '@/lib/db/types'
import { completeItems, uncompleteItems } from '@/lib/db/mutations'

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
          const colorMap: Record<string, string> = {
            high: 'bg-red-100 text-red-700',
            medium: 'bg-yellow-100 text-yellow-700',
            low: 'bg-green-100 text-green-700',
          }
          const cls = colorMap[strValue] ?? 'bg-gray-100 text-gray-600'
          return (
            <span key={key} className={`${cls} text-xs px-2 py-0.5 rounded-full`}>
              {strValue}
            </span>
          )
        }

        if (key === 'location') {
          return (
            <span key={key} className="text-xs text-gray-500">
              📍 {strValue}
            </span>
          )
        }

        if (key === 'effort') {
          return (
            <span key={key} className="text-xs text-gray-500">
              ⏱ {strValue}
            </span>
          )
        }

        if (key === 'skipability') {
          return (
            <span key={key} className="text-xs text-gray-400">
              {strValue}
            </span>
          )
        }

        return (
          <span key={key} className="text-xs text-gray-400">
            {key}: {strValue}
          </span>
        )
      })}
    </div>
  )
}

interface TodoItemProps {
  item: Item
}

export function TodoItem({ item }: TodoItemProps) {
  const handleToggle = async () => {
    if (item.completed) {
      await uncompleteItems([item.id])
    } else {
      await completeItems([item.id])
    }
  }

  return (
    <div className={`flex items-start gap-3 py-3 px-4 border-b border-gray-100 ${item.completed ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 border-gray-300 flex items-center justify-center"
        style={{ minWidth: '44px', minHeight: '44px', margin: '-9px' }}
        aria-label={item.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {item.completed && <span className="text-blue-500 text-sm">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-base ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.text}
        </p>
        <MetadataBadges metadata={item.metadata} />
      </div>
    </div>
  )
}
