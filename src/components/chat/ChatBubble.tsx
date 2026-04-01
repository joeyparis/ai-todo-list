'use client'

interface ChatBubbleProps {
  messageRole: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatBubble({ messageRole, content, isStreaming }: ChatBubbleProps) {
  const isUser = messageRole === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`
        max-w-[80%] px-4 py-2 rounded-2xl text-base break-words
        ${isUser
          ? 'bg-blue-500 text-white rounded-br-sm'
          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }
      `}>
        {content}
        {isStreaming && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  )
}
