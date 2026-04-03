import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import {
  extractAssistantMessageParts,
  summarizeAssistantParts,
  summarizeMessageForTranscript,
} from './persistence'

describe('extractAssistantMessageParts', () => {
  it('extracts parts from nested onFinish.message payload', () => {
    const parts = [{ type: 'text', text: 'Saved response' }]
    const result = extractAssistantMessageParts({
      message: {
        role: 'assistant',
        parts,
      },
    })

    expect(result).toEqual(parts)
  })

  it('extracts text content when assistant content is a plain string', () => {
    const result = extractAssistantMessageParts({
      message: {
        role: 'assistant',
        content: 'Assistant content fallback',
      },
    })

    expect(result).toEqual([{ type: 'text', text: 'Assistant content fallback' }])
  })

  it('falls back to last assistant message from messages array', () => {
    const result = extractAssistantMessageParts({
      message: {
        role: 'assistant',
      },
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
        { role: 'assistant', content: [{ type: 'text', text: 'Recovered from history' }] },
      ],
    })

    expect(result).toEqual([{ type: 'text', text: 'Recovered from history' }])
  })
})

describe('summarizeAssistantParts', () => {
  it('returns text content when present', () => {
    const result = summarizeAssistantParts([{ type: 'text', text: 'Hello there' }] as UIMessage['parts'])
    expect(result).toBe('Hello there')
  })

  it('returns a fallback summary for tool-only assistant messages', () => {
    const result = summarizeAssistantParts([
      {
        type: 'tool-addItems',
        toolCallId: 'call-1',
        toolName: 'addItems',
        input: { items: [{ text: 'Buy milk' }] },
      },
    ] as UIMessage['parts'])

    expect(result).toBe('Done!')
  })

  it('returns a fallback summary for non-text assistant parts without tool names', () => {
    const result = summarizeAssistantParts([
      {
        type: 'reasoning',
        text: '',
      },
    ] as UIMessage['parts'])

    expect(result).toBe('Done!')
  })
})

describe('summarizeMessageForTranscript', () => {
  it('keeps user text unchanged', () => {
    const result = summarizeMessageForTranscript({
      id: 'user-1',
      role: 'user',
      parts: [{ type: 'text', text: 'Add eggs' }],
    })

    expect(result).toBe('Add eggs')
  })

  it('keeps assistant tool-only messages visible in transcripts', () => {
    const result = summarizeMessageForTranscript({
      id: 'assistant-1',
      role: 'assistant',
      parts: [{ type: 'tool-completeItems', toolCallId: 'call-2', toolName: 'completeItems', input: { itemIds: ['a'] } }],
    } as UIMessage)

    expect(result).toBe('Done!')
  })
})
