'use client'
import { use, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SplitScreen } from '@/components/SplitScreen'
import { TodoPanel } from '@/components/todo/TodoPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useItems, useList } from '@/lib/db/hooks'

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const list = useList(id)
  const items = useItems(id)
  const clearChatRef = useRef<(() => void) | null>(null)
  const handleClearChat = useCallback(() => {
    clearChatRef.current?.()
  }, [])

  if (list === undefined || items === undefined) {
    return (
      <div className="flex flex-col md:flex-row h-[100dvh] bg-surface-50 dark:bg-surface-950 overflow-hidden">
        <div className="md:hidden h-14 border-b border-surface-200 dark:border-surface-800 flex items-center px-4 bg-white dark:bg-surface-900">
          <div className="skeleton h-6 w-6 rounded-full mr-3"></div>
          <div className="skeleton h-6 w-32 rounded-md"></div>
        </div>

        <div className="flex-1 flex flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
          <div className="hidden md:flex h-14 border-b border-surface-200 dark:border-surface-800 items-center px-4">
            <div className="skeleton h-6 w-6 rounded-full mr-3"></div>
            <div className="skeleton h-6 w-48 rounded-md"></div>
          </div>
          <div className="p-4 flex-1">
            <div className="skeleton h-10 w-full rounded-lg mb-6"></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton h-5 w-5 rounded-md"></div>
                <div className="skeleton h-5 w-3/4 rounded-md"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-5 w-5 rounded-md"></div>
                <div className="skeleton h-5 w-1/2 rounded-md"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-5 w-5 rounded-md"></div>
                <div className="skeleton h-5 w-5/6 rounded-md"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-5 w-5 rounded-md"></div>
                <div className="skeleton h-5 w-2/3 rounded-md"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-surface-50 dark:bg-surface-950">
          <div className="flex-1 p-4 flex flex-col gap-4 justify-end">
            <div className="skeleton h-16 w-3/4 rounded-2xl rounded-tl-sm self-start"></div>
            <div className="skeleton h-12 w-2/3 rounded-2xl rounded-tr-sm self-end"></div>
            <div className="skeleton h-24 w-5/6 rounded-2xl rounded-tl-sm self-start"></div>
          </div>
          <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900">
            <div className="skeleton h-12 w-full rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (list === null) {
    router.push('/')
    return null
  }

  return (
    <SplitScreen
      listName={list.name}
      listPanel={<TodoPanel listId={id} goal={list.goal} />}
      chatPanel={<ChatPanel listId={id} list={list} clearChatRef={clearChatRef} />}
      onBack={() => router.push('/')}
      onClearChat={handleClearChat}
      startOnChat={items.length === 0}
    />
  )
}
