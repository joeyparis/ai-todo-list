'use client'

import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from 'ai'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useItems, useMessages, useSettings } from '@/lib/db/hooks'
import { addMessage } from '@/lib/db/mutations'
import type { Message as DbMessage } from '@/lib/db/types'
import { executeToolCall } from '@/lib/llm/executor'
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
    content: message.content,
    parts: parseParts(message.parts, message.content),
  }
}

export function ChatPanel({ listId, list }: ChatPanelProps) {
  const persistedMessages = useMessages(listId)
  const items = useItems(listId)
  const settings = useSettings()

  const initialMessages = useMemo(() => {
    if (!persistedMessages) return []
    return persistedMessages.map(toUIMessage)
  }, [persistedMessages])

  const latestBodyRef = useRef({
    listState: { list, items: [] as NonNullable<typeof items> },
    settings: {
      provider: settings?.provider,
      apiKey: settings?.apiKey,
      model: settings?.model,
    },
  })

  useEffect(() => {
    latestBodyRef.current = {
      listState: {
        list,
        items: items ?? [],
      },
      settings: {
        provider: settings?.provider,
        apiKey: settings?.apiKey,
        model: settings?.model,
      },
    }
  }, [items, list, settings])

  const {
    messages,
    append,
    setMessages,
    status,
    error,
  } = useChat({
    api: '/api/chat',
    initialMessages,
    experimental_prepareRequestBody: ({ id, messages: requestMessages, requestBody }) => ({
      id,
      ...(requestBody ?? {}),
      messages: requestMessages.slice(-20),
      ...latestBodyRef.current,
    }),
    onFinish: async message => {
      if (message.role !== 'assistant') {
        return
      }

      await addMessage(
        listId,
        'assistant',
        message.content,
        message.parts ? JSON.stringify(message.parts) : undefined,
      )
    },
    onToolCall: async ({ toolCall }) => {
      const result = await executeToolCall(toolCall.toolName, toolCall.args, listId)
      return result
    },
  })

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
      if (!settings?.apiKey) {
        return
      }

      const userParts: UIMessage['parts'] = [{ type: 'text', text: content }]
      await addMessage(listId, 'user', content, JSON.stringify(userParts))

      await append(
        {
          id: crypto.randomUUID(),
          role: 'user',
          content,
          parts: userParts,
        },
        {
          body: latestBodyRef.current,
        },
      )
    },
    [append, listId, settings?.apiKey],
  )

  const viewMessages = useMemo(
    () =>
      messages
        .filter(
          (message): message is UIMessage & { role: 'user' | 'assistant' } =>
            message.role === 'user' || message.role === 'assistant',
        )
        .map(message => ({
          id: message.id,
          messageRole: message.role,
          content: message.content,
        })),
    [messages],
  )

  const isMissingApiKey = !settings?.apiKey
  const isLoading = status === 'submitted' || status === 'streaming'
  const inputDisabled = isMissingApiKey || isLoading

  return (
    <div className="flex h-full flex-col">
      {isMissingApiKey ? (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Missing AI settings. Add your provider, model, and API key in{' '}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>
          .
        </div>
      ) : null}

      {error ? (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message || 'Something went wrong while sending your message.'}
        </div>
      ) : null}

      <ChatMessages messages={viewMessages} isLoading={isLoading} />
      <ChatInput onSend={handleSend} disabled={inputDisabled} />
    </div>
  )
}
