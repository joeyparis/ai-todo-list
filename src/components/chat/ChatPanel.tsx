'use client'

import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useItems, useMessages, useSettings } from '@/lib/db/hooks'
import { addMessage } from '@/lib/db/mutations'
import type { Message as DbMessage } from '@/lib/db/types'
import { executeToolCall } from '@/lib/llm/executor'
import {
  extractAssistantMessageParts,
  summarizeAssistantParts,
  summarizeMessageForTranscript,
} from './persistence'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'

interface ChatPanelProps {
  listId: string
  list: {
    name: string
    goal?: string
  }
}

function parseParts(parts: string | undefined, content: string): UIMessage['parts'] {
  if (!parts) {
    return [{ type: 'text', text: content }]
  }

  try {
    const parsed = JSON.parse(parts)
    if (Array.isArray(parsed)) {
      return parsed as UIMessage['parts']
    }
  } catch {}

  return [{ type: 'text', text: content }]
}

function toUIMessage(message: DbMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: parseParts(message.parts, message.content),
  }
}

export function ChatPanel({ listId, list }: ChatPanelProps) {
  const persistedMessages = useMessages(listId)
  const items = useItems(listId)
  const settings = useSettings()
  const activeProvider = settings?.activeProvider
  const activeConfig = activeProvider ? settings?.providerConfigs?.[activeProvider] : undefined

  const persistedMessagesRef = useRef<typeof persistedMessages>(undefined)
  const initialMessages = useMemo(() => {
    if (!persistedMessages) return []
    const prevIds = persistedMessagesRef.current?.map(m => m.id).join(',') ?? ''
    const currIds = persistedMessages.map(m => m.id).join(',')
    if (prevIds === currIds && persistedMessagesRef.current !== undefined) {
      return (persistedMessagesRef.current ?? []).map(toUIMessage)
    }
    persistedMessagesRef.current = persistedMessages
    return persistedMessages.map(toUIMessage)
  }, [persistedMessages])

  const executedToolCallsRef = useRef(new Set<string>())
  const chatRef = useRef<ReturnType<typeof useChat>>(null)

  const latestBodyRef = useRef({
    listState: { list, items: [] as NonNullable<typeof items> },
    settings: {
      provider: activeProvider,
      apiKey: activeConfig?.apiKey,
      model: activeConfig?.model,
    },
  })

  useEffect(() => {
    latestBodyRef.current = {
      listState: {
        list,
        items: items ?? [],
      },
      settings: {
        provider: activeProvider,
        apiKey: activeConfig?.apiKey,
        model: activeConfig?.model,
      },
    }
  }, [items, list, activeProvider, activeConfig])

  const chat = useChat({
    messages: initialMessages,
    onError: (error) => {
      console.error('[ChatPanel] useChat error:', error)
    },
    onFinish: async (payload: unknown) => {
      try {
        const parts = extractAssistantMessageParts(payload)
        if (!parts) {
          return
        }

        const textContent = summarizeAssistantParts(parts)

        await addMessage(
          listId,
          'assistant',
          textContent,
          JSON.stringify(parts),
        )
      } catch (err) {
        console.error('[ChatPanel] onFinish error:', err)
      }
    },
    onToolCall: (async ({ toolCall }: any) => {
      const callId = toolCall.toolCallId
      if (callId && executedToolCallsRef.current.has(callId)) {
        return
      }
      if (callId) executedToolCallsRef.current.add(callId)
      try {
        const result = await executeToolCall(toolCall.toolName, toolCall.input ?? toolCall.args, listId)
        chatRef.current?.addToolOutput({ tool: toolCall.toolName, toolCallId: callId, output: result })
        return result
      } catch (err) {
        console.error('[ChatPanel] onToolCall error:', err)
        const errorResult = { success: false, error: String(err) }
        chatRef.current?.addToolOutput({ tool: toolCall.toolName, toolCallId: callId, state: 'output-error', errorText: String(err) })
        return errorResult
      }
    }) as any,
  })

  chatRef.current = chat

  const { messages, setMessages, status, error } = chat

  const hasHydratedRef = useRef(false)
  useEffect(() => {
    if (hasHydratedRef.current || persistedMessages === undefined) {
      return
    }

    setMessages(initialMessages)
    hasHydratedRef.current = true
  }, [initialMessages, persistedMessages, setMessages])

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeConfig?.apiKey) {
        return
      }

      const userParts: UIMessage['parts'] = [{ type: 'text', text: content }]
      await addMessage(listId, 'user', content, JSON.stringify(userParts))

      try {
        await chat.sendMessage(
          {
            text: content,
          },
          {
            body: {
              messages: chat.messages.slice(-20),
              ...latestBodyRef.current,
            },
          },
        )
      } catch (err) {
        console.error('[ChatPanel] sendMessage error:', err)
      }
    },
    [chat, listId, activeConfig?.apiKey],
  )

  const viewMessages = useMemo(
    () =>
      messages
        .filter(
          (message: any): message is UIMessage & { role: 'user' | 'assistant' } =>
            message.role === 'user' || message.role === 'assistant',
        )
        .map((message: any) => {
          return {
            id: message.id,
            messageRole: message.role,
            content: summarizeMessageForTranscript(message),
          }
        })
    .filter((msg: any) => (msg.content ?? '').trim() !== ''),
    [messages],
  )

  const isMissingApiKey = !activeConfig?.apiKey
  const isLoading = status === 'submitted' || status === 'streaming'
  const inputDisabled = isMissingApiKey || isLoading

  return (
    <div className="flex h-full flex-col bg-surface-50 dark:bg-surface-950 relative">
      {isMissingApiKey ? (
        <div data-testid="api-key-warning" className="absolute top-4 left-4 right-4 z-10 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-900 dark:text-amber-200 shadow-sm flex items-start gap-2 animate-slide-up">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" role="img" aria-label="Warning"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <div>
            Missing AI settings. Add your provider, model, and API key in{' '}
            <Link href="/settings" className="font-medium underline hover:text-amber-700 dark:hover:text-amber-100">
              Settings
            </Link>
            .
          </div>
        </div>
      ) : null}

      {error ? (
        <div data-testid="chat-error" className="absolute top-4 left-4 right-4 z-10 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950 p-3 text-sm text-rose-700 dark:text-rose-200 shadow-sm flex items-start gap-2 animate-slide-up">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0" role="img" aria-label="Error"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>{error.message || 'Something went wrong while sending your message.'}</div>
        </div>
      ) : null}

      <ChatMessages messages={viewMessages} isLoading={isLoading} isStreaming={status === 'streaming'} />
      
      {status === 'submitted' && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400 animate-pulse bg-surface-50 dark:bg-surface-950">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Thinking"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
          Thinking...
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={inputDisabled} />
    </div>
  )
}
