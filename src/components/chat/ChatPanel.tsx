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
    // Only recompute when message IDs actually changed (not just new array reference)
    const prevIds = persistedMessagesRef.current?.map(m => m.id).join(',') ?? ''
    const currIds = persistedMessages.map(m => m.id).join(',')
    if (prevIds === currIds && persistedMessagesRef.current !== undefined) {
      return (persistedMessagesRef.current ?? []).map(toUIMessage)
    }
    persistedMessagesRef.current = persistedMessages
    return persistedMessages.map(toUIMessage)
  }, [persistedMessages])

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
    onFinish: async (message: any) => {
      try {
        if (message.role !== 'assistant') {
          return
        }

        let textContent = (message.parts as any[])
          ?.filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('') ?? ''

        if (!textContent) {
          const toolNames = (message.parts as any[])
            ?.filter((p: any) => typeof p.type === 'string' && p.type.startsWith('tool-'))
            .map((p: any) => p.toolName)
            .filter(Boolean) ?? []
          if (toolNames.length > 0) {
            textContent = 'Done!'
          }
        }

        await addMessage(
          listId,
          'assistant',
          textContent,
          message.parts ? JSON.stringify(message.parts) : undefined,
        )
      } catch (err) {
        console.error('[ChatPanel] onFinish error:', err)
      }
    },
    onToolCall: (async ({ toolCall }: any) => {
      try {
        const result = await executeToolCall(toolCall.toolName, toolCall.input ?? toolCall.args, listId)
        return result
      } catch (err) {
        console.error('[ChatPanel] onToolCall error:', err)
        return { success: false, error: String(err) }
      }
    }) as any,
  })

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
          function summarizeToolCalls(message: UIMessage): string {
            const textParts = message.parts?.filter(p => p.type === 'text') ?? []
            const textContent = textParts.map((p: any) => p.text).join('')
            if (textContent) return textContent

            const toolParts = message.parts?.filter((p: any) => typeof p.type === 'string' && p.type.startsWith('tool-')) ?? []
            if (toolParts.length === 0) return ''
            const actions: string[] = []
            for (const part of toolParts) {
              const name = (part as any).toolName
              switch (name) {
                case 'addItems': actions.push('Added items'); break
                case 'completeItems': actions.push('Checked off items'); break
                case 'uncompleteItems': actions.push('Unchecked items'); break
                case 'updateItem': actions.push('Updated item'); break
                case 'deleteItems': actions.push('Removed items'); break
                case 'addAndCompleteItems': actions.push('Added completed items'); break
              }
            }
            return actions.length > 0 ? actions.join(', ') + '.' : 'Done!'
          }

          const content = message.role === 'assistant'
            ? summarizeToolCalls(message)
            : message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || ''

          return {
            id: message.id,
            messageRole: message.role,
            content,
          }
        })
    .filter((msg: any) => (msg.content ?? '').trim() !== ''),
    [messages],
  )

  const isMissingApiKey = !activeConfig?.apiKey
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
