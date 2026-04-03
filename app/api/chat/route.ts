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

function getLatestUserText(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return ''
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (typeof message !== 'object' || message === null) {
      continue
    }

    const role = (message as { role?: unknown }).role
    if (role !== 'user') {
      continue
    }

    const partsText = Array.isArray((message as { parts?: unknown }).parts)
      ? extractTextFromMessageContent((message as { parts?: unknown[] }).parts)
      : ''
    const contentText = extractTextFromMessageContent((message as { content?: unknown }).content)
    return (partsText || contentText).trim()
  }

  return ''
}

function shouldRestrictCompletionTools(latestUserText: string): boolean {
  if (!latestUserText) {
    return false
  }

  const normalized = latestUserText.toLowerCase()
  const hasCompletionLanguage =
    /\b(done|finished|completed|already|wrapped up|took care of|crossed off|check(?:ed)? off|picked up|knocked out)\b/i.test(normalized) ||
    /\bi\s+(?:also\s+)?(?:already\s+)?(?:did|finished|completed)\b/i.test(normalized) ||
    /\bthat(?:'s| is| was)\s+done\b/i.test(normalized)
  if (hasCompletionLanguage) {
    return false
  }

  return /\b(add|create|new|include|another|more|also|plus)\b/i.test(normalized)
}

function getTurnSpecificInstruction(latestUserText: string): string {
  if (!latestUserText) {
    return ''
  }

  const normalized = latestUserText.toLowerCase()
  const indicatesCompletionIntent =
    /\b(done|finished|completed|already|wrapped up|took care of|crossed off|check(?:ed)? off|picked up|knocked out)\b/i.test(normalized) ||
    /\bi\s+(?:also\s+)?(?:already\s+)?(?:did|finished|completed)\b/i.test(normalized) ||
    /\b(mark|check|cross)\b.*\b(done|complete|off)\b/i.test(normalized) ||
    /\bthat(?:'s| is| was)\s+done\b/i.test(normalized)

  if (!indicatesCompletionIntent) {
    return ''
  }

  return [
    '',
    'Turn-specific requirement:',
    'The latest user message indicates completion intent.',
    'Before your final reply, you must call exactly one completion tool when action is clear:',
    '- Use completeItems for existing tasks that match.',
    '- Use addAndCompleteItems only when the completed task is not on the list.',
    '- Do not acknowledge completion without the tool call.',
  ].join('\n')
}

function getAllowedTools(latestUserText: string) {
  if (!shouldRestrictCompletionTools(latestUserText)) {
    return todoTools
  }

  const { completeItems: _completeItems, addAndCompleteItems: _addAndCompleteItems, ...safeTools } = todoTools
  return safeTools
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, listState, settings } = body

    // Validate required fields
    if (!messages || !settings?.apiKey || !settings?.provider || !settings?.model) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const baseSystemPrompt = buildSystemPrompt(
      listState?.list ?? { name: 'My List' },
      listState?.items ?? [],
    )
    const latestUserText = getLatestUserText(messages)
    const allowedTools = getAllowedTools(latestUserText)
    const systemPrompt = `${baseSystemPrompt}${getTurnSpecificInstruction(latestUserText)}`

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

    const coreMessages = await convertToModelMessages(messages as Omit<UIMessage, 'id'>[], {
      ignoreIncompleteToolCalls: true,
    })

    const result = streamText({
      model: providerModel,
      system: systemPrompt,
      messages: coreMessages,
      tools: allowedTools,
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
