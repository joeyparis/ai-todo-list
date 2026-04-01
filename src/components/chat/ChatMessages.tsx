'use client'
import { useEffect, useRef } from 'react'
import { ChatBubble } from './ChatBubble'

interface Message {
  id: string
  messageRole: 'user' | 'assistant'
  content: string
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400 text-sm">
        Start by telling me what you need to get done
      </div>
    )
  }

  const loadingBubble = isLoading ? <ChatBubble messageRole="assistant" content="..." isStreaming /> : null

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map(msg => (
        <ChatBubble key={msg.id} messageRole={msg.messageRole} content={msg.content} />
      ))}
      {loadingBubble}
      <div ref={bottomRef} />
    </div>
  )
}
