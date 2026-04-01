'use client'
import { useState } from 'react'
import { ChatMessages } from '@/components/chat/ChatMessages'
import { ChatInput } from '@/components/chat/ChatInput'

const MOCK_MESSAGES = [
  { id: '1', messageRole: 'user' as const, content: 'I need to buy milk, eggs, and bread' },
  { id: '2', messageRole: 'assistant' as const, content: 'Added 3 items to your list! Noted these as grocery essentials with high priority.' },
  { id: '3', messageRole: 'user' as const, content: 'I already picked up the milk' },
  { id: '4', messageRole: 'assistant' as const, content: 'Got it - marked milk as done!' },
]

export default function ChatPreviewPage() {
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  
  const handleSend = (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), messageRole: 'user' as const, content: text }])
  }
  
  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <div className="p-3 border-b text-sm font-medium text-gray-500 flex-shrink-0">
        Chat Preview (Dev)
      </div>
      <ChatMessages messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  )
}
