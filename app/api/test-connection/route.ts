import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
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
    const providerModel = provider === 'openai'
      ? createOpenAI({ apiKey })(model)
      : createAnthropic({ apiKey })(model)
    await generateText({ model: providerModel, prompt: 'Say "ok"', maxTokens: 5 })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const isAuthError = message.toLowerCase().includes('auth') || message.toLowerCase().includes('key') || message.toLowerCase().includes('401') || message.toLowerCase().includes('unauthorized')
    return NextResponse.json({ error: isAuthError ? 'Invalid API key' : message }, { status: isAuthError ? 401 : 500 })
  }
}
