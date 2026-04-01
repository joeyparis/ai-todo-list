'use client'
import { useItems } from '@/lib/db/hooks'
import { TodoItem } from './TodoItem'
import { AddItemInput } from './AddItemInput'

interface TodoPanelProps {
  listId: string
  goal?: string
}

export function TodoPanel({ listId, goal }: TodoPanelProps) {
  const items = useItems(listId)

  if (items === undefined) {
    return <div className="p-4 text-gray-400 text-sm">Loading...</div>
  }

  const activeItems = items.filter(item => !item.completed)
  const completedItems = items.filter(item => item.completed)

  return (
    <div className="flex flex-col h-full">
      {goal && (
        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
          Goal: {goal}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-sm">
          No items yet. Use the chat below to brain dump your tasks!
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeItems.map(item => (
            <TodoItem key={item.id} item={item} />
          ))}
          {completedItems.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs text-gray-400 font-medium border-t border-gray-100 mt-2">
                Completed ({completedItems.length})
              </div>
              {completedItems.map(item => (
                <TodoItem key={item.id} item={item} />
              ))}
            </>
          )}
        </div>
      )}

      <AddItemInput listId={listId} />
    </div>
  )
}
