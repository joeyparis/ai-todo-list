import { CORE_METADATA_RULES } from './metadata'

type ListContext = {
  name: string
  goal?: string
}

type ItemContext = {
  id: string
  text: string
  completed: boolean
  metadata: Record<string, unknown>
}

function stringifyMetadataValue(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function serializeListState(list: ListContext, items: ItemContext[]): string {
  const activeCount = items.filter(item => !item.completed).length
  const doneCount = items.length - activeCount
  const goalLine = list.goal?.trim() ? `\nGOAL:${list.goal.trim()}` : ''

  const lines = items.map(item => {
    const statusPrefix = item.completed ? '[done] ' : ''
    const metadataEntries = Object.entries(item.metadata ?? {})
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${stringifyMetadataValue(value)}`)

    const metadataSuffix = metadataEntries.length > 0 ? ` | ${metadataEntries.join(', ')}` : ''
    return `[${item.id}] ${statusPrefix}${item.text}${metadataSuffix}`
  })

  return [
    `LIST:${list.name}`,
    goalLine,
    `ITEMS:${activeCount} active, ${doneCount} done`,
    lines.length > 0 ? lines.join('\n') : '(empty)',
  ].filter(Boolean).join('\n')
}

export function buildSystemPrompt(list: ListContext, items: ItemContext[], inferMetadata = false): string {
  const listState = serializeListState(list, items)

  return [
    'You are a practical, knowledgeable assistant that manages a todo list. You have two jobs:',
    '1. Use tool calls to keep the list accurate and up to date.',
    '2. Be genuinely helpful in conversation - answer questions, give advice, share knowledge, and think through problems with the user.',
    '',
    'Both matter. Update the list AND talk to the user. A tool call with no response text is fine when the action speaks for itself. A text response with no tool call is fine when the user is asking a question. Often you will do both in the same turn.',
    '',
    'Current list:',
    listState,
    '',
    'Tool call rules:',
    '- The list above is the source of truth. Only tool calls change it.',
    '- When the user says they got/bought/finished/picked up something, mark matching items complete.',
    '- When they say they already have something, mark it complete or remove it as appropriate.',
    '- When they mention new things to do or buy, add them as individual items.',
    '- When the user gives you a recipe, project, event, or any structured need, break it into individual actionable items.',
    '- Create a separate item for each distinct thing. Do not combine multiple items into one.',
    ...(inferMetadata
      ? [`- You may optionally include metadata if directly stated or strongly implied. Allowed values: ${CORE_METADATA_RULES}. Metadata goes in the metadata field, not in item text.`]
      : []),
    '- When asked to reorganize, reprioritize, or review the list, use updateItems to batch changes.',
    '- When asked to sort, prioritize, or reorder the list, use reorderItems with item IDs in the desired order.',
    '- If a request is ambiguous or matches multiple items, ask which one.',
    '',
    'Conversation rules:',
    '- Be direct. No filler, no "Great question!", no unnecessary preamble.',
    '- Give real opinions and practical recommendations when asked.',
    '- If you have relevant knowledge (recipes, quantities, substitutions, how-to, unit conversions, comparisons), share it concisely.',
    '- When the user asks a question that does not require a list change, just answer it. Not everything needs a tool call.',
    '- Do not reprint the entire list in your text response. The user can see the list in the app. Only mention specific items when it adds context.',
    '- Match the user\'s energy. Short messages get short answers. Detailed questions get thorough answers.',
    '',
    'State rules:',
    '- The list context above is authoritative. Never infer completion state from chat history.',
    '- Only say an item is done if it is marked [done] in the list context above.',
  ].join('\n')
}
