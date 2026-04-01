import { streamText, convertToCoreMessages } from 'ai'
import type { Message } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/llm/prompts'
import { todoTools } from '@/lib/llm/tools'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, listState, settings } = body

    // Validate required fields
    if (!messages || !settings?.apiKey || !settings?.provider || !settings?.model) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(
      listState?.list ?? { name: 'My List' },
      listState?.items ?? [],
    )

    let providerModel: any
    switch (settings.provider) {
      case 'openai':
        providerModel = createOpenAI({ apiKey: settings.apiKey })(settings.model)
        break
      case 'anthropic':
        providerModel = createAnthropic({ apiKey: settings.apiKey })(settings.model)
        break
      case 'google':
        providerModel = createGoogleGenerativeAI({ apiKey: settings.apiKey })(settings.model)
        break
      case 'openrouter':
        providerModel = createOpenRouter({ apiKey: settings.apiKey }).chat(settings.model)
        break
      default:
        return Response.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    const coreMessages = convertToCoreMessages(messages as Omit<Message, 'id'>[])

    const result = streamText({
      model: providerModel,
      system: systemPrompt,
      messages: coreMessages,
      tools: todoTools,
      maxSteps: 5,
    })

    return result.toDataStreamResponse({
      getErrorMessage: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error'
        const isAuth =
          message.includes('401') ||
          message.toLowerCase().includes('unauthorized') ||
          message.toLowerCase().includes('api key') ||
          message.toLowerCase().includes('authentication')
        return isAuth ? 'Invalid API key' : message
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isAuthError =
      message.includes('401') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('api key') ||
      message.toLowerCase().includes('authentication') ||
      message.toLowerCase().includes('auth')

    return Response.json(
      { error: isAuthError ? 'Invalid API key' : message },
      { status: isAuthError ? 401 : 500 },
    )
  }
}
