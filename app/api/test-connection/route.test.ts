import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('ai', async () => {
  const actual = await vi.importActual('ai')
  return {
    ...(actual as any),
    generateText: vi.fn(async () => ({ text: 'ok' })),
  }
})

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mock-model')),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'mock-model')),
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => 'mock-model')),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({ chat: vi.fn(() => 'mock-model') })),
}))

import { POST } from './route'
import { generateText } from 'ai'

function makeRequest(body: any): Request {
  return new Request('http://localhost/api/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/test-connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when provider is missing', async () => {
    const res = await POST(makeRequest({ apiKey: 'sk-test', model: 'gpt-4o' }) as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({ provider: 'openai', model: 'gpt-4o' }) as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when model is missing', async () => {
    const res = await POST(makeRequest({ provider: 'openai', apiKey: 'sk-test' }) as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 for unsupported provider', async () => {
    const res = await POST(makeRequest({ provider: 'fakeprovider', apiKey: 'key', model: 'model' }) as any)
    expect(res.status).toBe(400)
  })

  it('returns success for valid request', async () => {
    const res = await POST(makeRequest({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' }) as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(generateText).toHaveBeenCalledOnce()
  })

  it('calls generateText with maxTokens >= 16', async () => {
    await POST(makeRequest({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' }) as any)
    const call = (generateText as any).mock.calls[0][0]
    const tokenLimit = call.maxTokens ?? call.maxOutputTokens ?? 0
    expect(tokenLimit).toBeGreaterThanOrEqual(16)
  })

  it('returns 401 for auth errors', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('401 Unauthorized'))
    const res = await POST(makeRequest({ provider: 'openai', apiKey: 'bad-key', model: 'gpt-4o' }) as any)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid API key')
  })

  it('returns 500 for non-auth errors', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('Rate limit exceeded'))
    const res = await POST(makeRequest({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' }) as any)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Rate limit')
  })
})
