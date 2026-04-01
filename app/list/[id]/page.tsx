'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { SplitScreen } from '@/components/SplitScreen'
import { TodoPanel } from '@/components/todo/TodoPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useList } from '@/lib/db/hooks'

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const list = useList(id)

  if (list === undefined) {
    return (
      <div className="flex items-center justify-center h-[100dvh] text-gray-400">
        Loading...
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
      chatPanel={<ChatPanel listId={id} list={list} />}
      onBack={() => router.push('/')}
    />
  )
}
