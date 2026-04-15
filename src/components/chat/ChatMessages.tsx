'use client'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChatBubble } from './ChatBubble'
import type { ChatImage } from './ChatBubble'
import { fadeVariants, slideUpVariants, tweenDefault, springDefault } from '@/lib/motion'

interface Message {
  id: string
  messageRole: 'user' | 'assistant'
  content: string
  images?: ChatImage[]
}

interface ChatMessagesProps {
  messages: Message[]
  isLoading?: boolean
  isStreaming?: boolean
}

export function ChatMessages({ messages, isLoading, isStreaming }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <motion.div
        data-testid="chat-empty-state"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        transition={tweenDefault}
      >
        <motion.div
          className="w-24 h-24 mb-6 relative text-primary-500 dark:text-primary-400"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full opacity-20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </motion.div>
        <h3 className="text-lg font-medium text-surface-900 dark:text-surface-100 mb-2">How can I help?</h3>
        <p className="text-surface-500 dark:text-surface-400 text-sm max-w-[250px]">
          Start by telling me what you need to get done, or ask me to organize your tasks.
        </p>
      </motion.div>
    )
  }

  const loadingBubble = isLoading ? (
    <motion.div
      className="flex flex-col items-start mb-4"
      data-testid="typing-indicator"
      variants={slideUpVariants}
      initial="initial"
      animate="animate"
      transition={springDefault}
    >
      <div className="flex items-center gap-1 mb-1 px-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
        <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">Assistant</span>
      </div>
      <div className="bg-surface-100 dark:bg-surface-800 px-4 py-3.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1 h-[44px]">
        <div className="typing-dot bg-surface-400 dark:bg-surface-500" style={{ animationDelay: '0ms' }} />
        <div className="typing-dot bg-surface-400 dark:bg-surface-500" style={{ animationDelay: '150ms' }} />
        <div className="typing-dot bg-surface-400 dark:bg-surface-500" style={{ animationDelay: '300ms' }} />
      </div>
    </motion.div>
  ) : null

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-surface-50 dark:bg-surface-950">
      {messages.map((msg, idx) => (
        <ChatBubble
          key={msg.id}
          messageRole={msg.messageRole}
          content={msg.content}
          images={msg.images}
          isStreaming={isStreaming && msg.messageRole === 'assistant' && idx === messages.length - 1}
        />
      ))}
      {loadingBubble}
      <div ref={bottomRef} className="h-1" />
    </div>
  )
}
