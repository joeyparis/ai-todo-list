import type { UIMessage } from 'ai'

type FinishPayload = {
  role?: unknown
  parts?: unknown
  content?: unknown
  messages?: unknown
  message?: {
    role?: unknown
    parts?: unknown
    content?: unknown
  }
}

function isAssistantRole(value: unknown): value is 'assistant' {
  return value === 'assistant'
}

function hasMessageObject(payload: FinishPayload): payload is FinishPayload & { message: { role?: unknown; parts?: unknown } } {
  return typeof payload.message === 'object' && payload.message !== null
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map(part => {
      if (typeof part === 'string') {
        return part
      }

      if (typeof part !== 'object' || part === null) {
        return ''
      }

      const maybeText = (part as { text?: unknown }).text
      return typeof maybeText === 'string' ? maybeText : ''
    })
    .join('')
}

function toTextParts(text: string): UIMessage['parts'] | null {
  if (!text.trim()) {
    return null
  }

  return [{ type: 'text', text }]
}

function extractAssistantPartsFromMessageLike(messageLike: unknown): UIMessage['parts'] | null {
  if (typeof messageLike !== 'object' || messageLike === null) {
    return null
  }

  const candidate = messageLike as { role?: unknown; parts?: unknown; content?: unknown }
  if (!isAssistantRole(candidate.role)) {
    return null
  }

  if (Array.isArray(candidate.parts)) {
    return candidate.parts as UIMessage['parts']
  }

  return toTextParts(extractTextFromContent(candidate.content))
}

export function extractAssistantMessageParts(payload: unknown): UIMessage['parts'] | null {
  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const finishPayload = payload as FinishPayload

  const topLevelParts = extractAssistantPartsFromMessageLike(finishPayload)
  if (topLevelParts) {
    return topLevelParts
  }

  if (hasMessageObject(finishPayload)) {
    const nestedMessageParts = extractAssistantPartsFromMessageLike(finishPayload.message)
    if (nestedMessageParts) {
      return nestedMessageParts
    }
  }

  if (Array.isArray(finishPayload.messages)) {
    const lastAssistant = [...finishPayload.messages]
      .reverse()
      .find(message => {
        if (typeof message !== 'object' || message === null) {
          return false
        }

        return isAssistantRole((message as { role?: unknown }).role)
      })

    if (lastAssistant) {
      return extractAssistantPartsFromMessageLike(lastAssistant)
    }
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

  const parts = message.parts ?? []
  const text = parts
    .filter((part): part is Extract<UIMessage['parts'][number], { type: 'text' }> => part.type === 'text')
    .map(part => part.text)
    .join('')

  if (text) return text

  const hasFiles = parts.some(part => part.type === 'file')
  if (hasFiles) return '[image]'

  return ''
}
