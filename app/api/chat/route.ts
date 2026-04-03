import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage, LanguageModel } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/llm/prompts'
import { todoTools } from '@/lib/llm/tools'

export const dynamic = 'force-dynamic'

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') {
          return part
        }

        if (typeof part === 'object' && part !== null && 'type' in part && (part as { type?: unknown }).type === 'text') {
          const text = (part as { text?: unknown }).text
          return typeof text === 'string' ? text : ''
        }

        return ''
      })
      .join(' ')
  }

  return ''
}

function getRecentMessages(messages: unknown): Omit<UIMessage, 'id'>[] {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages
    .filter((message): message is Omit<UIMessage, 'id'> => {
      if (typeof message !== 'object' || message === null) {
        return false
      }

      const role = (message as { role?: unknown }).role
      return role === 'user' || role === 'assistant' || role === 'system'
    })
    .slice(-20)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, listState, settings } = body
    const recentMessages = getRecentMessages(messages)

    // Validate required fields
    if (recentMessages.length === 0 || !settings?.apiKey || !settings?.provider || !settings?.model) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const latestMessage = recentMessages.at(-1)
    if (!latestMessage || latestMessage.role !== 'user') {
      return Response.json({ error: 'Latest message must be from user' }, { status: 400 })
    }

    let providerModel: LanguageModel
    switch (settings.provider) {
      case 'openai':
        providerModel = createOpenAI({ apiKey: settings.apiKey })(settings.model)
        break
      case 'anthropic':
        providerModel = createAnthropic({ apiKey: settings.apiKey })(settings.model)
        break
      case 'google':
        if (settings.apiKey.startsWith('ya29.')) {
          providerModel = createGoogleGenerativeAI({
            headers: { Authorization: `Bearer ${settings.apiKey}` },
          })(settings.model)
        } else {
          providerModel = createGoogleGenerativeAI({ apiKey: settings.apiKey })(settings.model)
        }
        break
      case 'openrouter':
        providerModel = createOpenRouter({ apiKey: settings.apiKey }).chat(settings.model)
        break
      default:
        return Response.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    const coreMessages = await convertToModelMessages(recentMessages, {
      ignoreIncompleteToolCalls: true,
    })

    const result = streamText({
      model: providerModel,
      system: buildSystemPrompt(listState?.list ?? { name: 'My List' }, listState?.items ?? []),
      messages: coreMessages,
      tools: todoTools,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isAuthError =
      message.includes('401') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('api key') ||
      message.toLowerCase().includes('authentication') ||
      message.toLowerCase().includes('auth')

    const sanitized = message.replace(new RegExp('[^\\x00-\\x7F]', 'g'), '?')
    return Response.json(
      { error: isAuthError ? 'Invalid API key' : sanitized },
      { status: isAuthError ? 401 : 500 },
    )
  }
}
