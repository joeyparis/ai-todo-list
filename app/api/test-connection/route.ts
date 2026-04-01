import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model } = await req.json() as {
      provider: string
      apiKey: string
      model: string
    }
    if (!provider || !apiKey || !model) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    let providerModel: any
    switch (provider) {
      case 'openai':
        providerModel = createOpenAI({ apiKey })(model)
        break
      case 'anthropic':
        providerModel = createAnthropic({ apiKey })(model)
        break
      case 'google':
        if (apiKey.startsWith('ya29.')) {
          providerModel = createGoogleGenerativeAI({
            headers: { Authorization: `Bearer ${apiKey}` },
          })(model)
        } else {
          providerModel = createGoogleGenerativeAI({ apiKey })(model)
        }
        break
      case 'openrouter':
        providerModel = createOpenRouter({ apiKey }).chat(model)
        break
      default:
        return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }
    await generateText({ model: providerModel, prompt: 'Say "ok"', maxOutputTokens: 5 })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isAuthError = message.toLowerCase().includes('auth') || message.toLowerCase().includes('key') || message.toLowerCase().includes('401') || message.toLowerCase().includes('unauthorized')
    return NextResponse.json({ error: isAuthError ? 'Invalid API key' : message }, { status: isAuthError ? 401 : 500 })
  }
}
