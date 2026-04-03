import type { UIMessage } from 'ai'

type FinishPayload = {
  role?: unknown
  parts?: unknown
  message?: {
    role?: unknown
    parts?: unknown
  }
}

function isAssistantRole(value: unknown): value is 'assistant' {
  return value === 'assistant'
}

function hasMessageObject(payload: FinishPayload): payload is FinishPayload & { message: { role?: unknown; parts?: unknown } } {
  return typeof payload.message === 'object' && payload.message !== null
}

export function extractAssistantMessageParts(payload: unknown): UIMessage['parts'] | null {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const finishPayload = payload as FinishPayload

  if (isAssistantRole(finishPayload.role) && Array.isArray(finishPayload.parts)) {
    return finishPayload.parts as UIMessage['parts']
  }

  if (
    hasMessageObject(finishPayload) &&
    isAssistantRole(finishPayload.message.role) &&
    Array.isArray(finishPayload.message.parts)
  ) {
    return finishPayload.message.parts as UIMessage['parts']
  }

  return null
}

export function summarizeAssistantParts(parts: UIMessage['parts']): string {
  const text = parts
    .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map(part => part.text)
    .join('')

  if (text) {
    return text
  }

  const toolNames = parts
    .filter((part): part is Extract<UIMessage['parts'][number], { type: `tool-${string}` }> =>
      typeof part.type === 'string' && part.type.startsWith('tool-'),
    )
    .map(part => part.type.replace(/^tool-/, ''))
    .filter(name => name.length > 0)

  if (toolNames.length > 0) {
    return 'Done!'
  }

  return parts.some(part => part.type !== 'text') ? 'Done!' : ''
}

export function summarizeMessageForTranscript(message: UIMessage): string {
  if (message.role === 'assistant') {
    return summarizeAssistantParts(message.parts ?? [])
  }

  return (message.parts ?? [])
    .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map(part => part.text)
    .join('')
}
