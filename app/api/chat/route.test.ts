import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('ai', async () => {
  const actual = await vi.importActual('ai')
  return {
    ...(actual as any),
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: vi.fn(() => new Response('streamed text', { status: 200 })),
    })),
    convertToModelMessages: vi.fn(async (msgs: any) => msgs),
  }
})

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mock-openai-model')),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'mock-anthropic-model')),
}))

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => 'mock-google-model')),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({ chat: vi.fn(() => 'mock-openrouter-model') })),
}))

import { POST } from './route'
import { streamText } from 'ai'

function makeRequest(body: any): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  messages: [{ role: 'user', content: 'Hello' }],
  listState: { list: { name: 'Test' }, items: [] },
  settings: { provider: 'openai', apiKey: 'sk-test123', model: 'gpt-4o-mini' },
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when messages are missing', async () => {
    const res = await POST(makeRequest({ settings: validBody.settings }) as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Missing')
  })

  it('returns 400 when latest message is not from user', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'assistant', content: 'Done!' }],
    }) as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Latest message must be from user')
  })

  it('returns 400 when settings are missing', async () => {
    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }) as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 when apiKey is missing', async () => {
    const res = await POST(makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
      settings: { provider: 'openai', model: 'gpt-4o' },
    }) as any)
    expect(res.status).toBe(400)
  })

  it('returns 400 for unsupported provider', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      settings: { ...validBody.settings, provider: 'unsupported' },
    }) as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Unsupported')
  })

  it('calls streamText and returns streaming response for valid request', async () => {
    const res = await POST(makeRequest(validBody) as any)
    expect(res.status).toBe(200)
    expect(streamText).toHaveBeenCalledOnce()
    const call = (streamText as any).mock.calls[0][0]
    expect(call.system).toBeTruthy()
    expect(call.tools).toBeTruthy()
    expect(call.model).toBe('mock-openai-model')
  })



  it('selects the correct provider for anthropic', async () => {
    await POST(makeRequest({
      ...validBody,
      settings: { provider: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-20250514' },
    }) as any)
    const call = (streamText as any).mock.calls[0][0]
    expect(call.model).toBe('mock-anthropic-model')
  })

  it('selects the correct provider for google', async () => {
    await POST(makeRequest({
      ...validBody,
      settings: { provider: 'google', apiKey: 'AIzaTest123', model: 'gemini-2.5-flash' },
    }) as any)
    const call = (streamText as any).mock.calls[0][0]
    expect(call.model).toBe('mock-google-model')
  })

  it('selects the correct provider for openrouter', async () => {
    await POST(makeRequest({
      ...validBody,
      settings: { provider: 'openrouter', apiKey: 'sk-or-test', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    }) as any)
    const call = (streamText as any).mock.calls[0][0]
    expect(call.model).toBe('mock-openrouter-model')
  })

  it('handles google OAuth tokens', async () => {
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
    await POST(makeRequest({
      ...validBody,
      settings: { provider: 'google', apiKey: 'ya29.oauth-token-here', model: 'gemini-2.5-flash' },
    }) as any)
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('ya29.') }) })
    )
  })

  it('returns 500 with sanitized error on unexpected failure', async () => {
    vi.mocked(streamText).mockImplementationOnce(() => { throw new Error('Something went wrong') })
    const res = await POST(makeRequest(validBody) as any)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Something went wrong')
  })

  it('uses only the most recent 20 messages for model conversion', async () => {
    const messages = Array.from({ length: 30 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `m-${index}`,
    }))
    messages[messages.length - 1] = { role: 'user', content: 'latest-user' }

    await POST(makeRequest({
      ...validBody,
      messages,
    }) as any)

    const { convertToModelMessages } = await import('ai')
    expect(convertToModelMessages).toHaveBeenCalledOnce()
    const convertedInput = (convertToModelMessages as any).mock.calls[0][0]
    expect(Array.isArray(convertedInput)).toBe(true)
    expect(convertedInput).toHaveLength(20)
    expect(convertedInput[convertedInput.length - 1]?.content).toBe('latest-user')
  })

  it('passes all tools to streamText regardless of message content', async () => {
    // Test 1: completion message
    await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'user', content: 'I set up the litterbox' }],
    }) as any)

    let call = (streamText as any).mock.calls[0][0]
    expect(call.tools.addItems).toBeTruthy()
    expect(call.tools.completeItems).toBeTruthy()
    expect(call.tools.uncompleteItems).toBeTruthy()
    expect(call.tools.updateItem).toBeTruthy()
    expect(call.tools.deleteItems).toBeTruthy()
    expect(call.tools.addAndCompleteItems).toBeTruthy()

    vi.clearAllMocks()

    // Test 2: add message
    await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'user', content: 'add pick up dry cleaning' }],
    }) as any)

    call = (streamText as any).mock.calls[0][0]
    expect(call.tools.addItems).toBeTruthy()
    expect(call.tools.completeItems).toBeTruthy()
    expect(call.tools.uncompleteItems).toBeTruthy()
    expect(call.tools.updateItem).toBeTruthy()
    expect(call.tools.deleteItems).toBeTruthy()
    expect(call.tools.addAndCompleteItems).toBeTruthy()

    vi.clearAllMocks()

    // Test 3: neutral message
    await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'user', content: 'Hello' }],
    }) as any)

    call = (streamText as any).mock.calls[0][0]
    expect(call.tools.addItems).toBeTruthy()
    expect(call.tools.completeItems).toBeTruthy()
    expect(call.tools.uncompleteItems).toBeTruthy()
    expect(call.tools.updateItem).toBeTruthy()
    expect(call.tools.deleteItems).toBeTruthy()
    expect(call.tools.addAndCompleteItems).toBeTruthy()
  })

  it('does not set toolChoice on any request', async () => {
    await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'user', content: 'I set up the litterbox' }],
      listState: {
        list: { name: 'House' },
        items: [
          { id: 'item-litter', text: 'Set up new litter box', completed: false, metadata: {} },
          { id: 'item-laundry', text: 'Do laundry', completed: false, metadata: {} },
        ],
      },
    }) as any)

    const call = (streamText as any).mock.calls[0][0]
    expect(call.toolChoice).toBeUndefined()
  })

  it('does not inject per-turn instructions into system prompt', async () => {
    await POST(makeRequest({
      ...validBody,
      messages: [{ role: 'user', content: 'I also did the groceries' }],
      listState: {
        list: { name: 'House' },
        items: [
          { id: 'item-groceries', text: 'Buy groceries', completed: false, metadata: {} },
        ],
      },
    }) as any)

    const call = (streamText as any).mock.calls[0][0]
    expect(call.system).not.toContain('Turn-specific requirement:')
    expect(call.system).not.toContain('Forced completion target:')
  })

  it('system prompt is built from list state only', async () => {
    await POST(makeRequest({
      ...validBody,
      listState: {
        list: { name: 'My Weekend List' },
        items: [{ id: 'x1', text: 'Buy eggs', completed: false, metadata: {} }],
      },
    }) as any)

    const call = (streamText as any).mock.calls[0][0]
    expect(call.system).toContain('My Weekend List')
    expect(call.system).toContain('Buy eggs')
  })
})
