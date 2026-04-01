import { describe, it, expect } from 'vitest'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

describe('streamText result shape (integration)', () => {
  it('has toUIMessageStreamResponse method', () => {
    const model = createOpenAI({ apiKey: 'fake-key-for-shape-test' })('gpt-4o-mini')

    const result = streamText({
      model,
      prompt: 'test',
    })

    expect(typeof (result as any).toUIMessageStreamResponse).toBe('function')
    expect(typeof (result as any).toTextStreamResponse).toBe('function')
  })

  it('does NOT have toDataStreamResponse method', () => {
    const model = createOpenAI({ apiKey: 'fake' })('gpt-4o-mini')
    const result = streamText({ model, prompt: 'test' })

    expect((result as any).toDataStreamResponse).toBeUndefined()
  })
})
