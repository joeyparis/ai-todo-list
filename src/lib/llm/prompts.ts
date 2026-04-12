import { CORE_METADATA_RULES } from './metadata'

type ListContext = {
  name: string
  goal?: string
}

type ItemContext = {
  id: string
  text: string
  completed: boolean
  category?: string
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
    const categoryPrefix = item.category?.trim() ? `(category: ${item.category.trim()}) ` : ''
    const metadataEntries = Object.entries(item.metadata ?? {})
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${stringifyMetadataValue(value)}`)

    const metadataSuffix = metadataEntries.length > 0 ? ` | ${metadataEntries.join(', ')}` : ''
    return `[${item.id}] ${statusPrefix}${categoryPrefix}${item.text}${metadataSuffix}`
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
    'You are a practical, knowledgeable assistant that manages a todo list and helps the user think through questions.',
    'Use tool calls to keep the list accurate. Give direct, useful replies.',
    '',
    'Use tools when the list should change. Use plain text when it should not. Often do both.',
    '',
    'Current list:',
    listState,
    '',
    'Tool call rules:',
    '- The list above is the source of truth. Only tool calls change it.',
    '- When the user says they got, bought, finished, or picked up something, mark matching items complete.',
    '- When they already have something, mark it complete or remove it if that fits better.',
    '- When they mention new things to do or buy, add them as individual items.',
     '- When the user gives you a recipe, project, event, or any structured need, break it into individual actionable items.',
     '- Create a separate item for each distinct thing. Do not combine multiple items into one.',
     ...(inferMetadata
       ? [`- You may optionally include metadata if directly stated or strongly implied. Allowed values: ${CORE_METADATA_RULES}. Metadata goes in the metadata field, not in item text.`]
       : []),
      '- You may assign a freeform category to group related items, like grocery sections. Omit category when grouping is unnecessary.',
      '- When changing categories, use the category field on updateItem or updateItems. Do not put category names in item text.',
      '- When asked to reorganize, reprioritize, recategorize, or review the list, use updateItems for batch changes.',
      '- When asked to sort, prioritize, or reorder the list, use reorderItems with item IDs in the desired order.',
      '- If a request is ambiguous or matches multiple items, ask which one.',
    '',
    'Conversation rules:',
    '- Be direct. No filler or unnecessary preamble.',
    '- Give real opinions and practical recommendations when asked.',
    '- Share relevant knowledge like recipes, quantities, substitutions, how-to, conversions, or comparisons concisely.',
    '- When the user asks a question that does not require a list change, just answer it. Not everything needs a tool call.',
    '- Do not reprint the whole list. Mention specific items only when it adds context.',
    '- Match the user\'s energy. Short messages get short answers. Detailed questions get thorough answers.',
    '',
    'State rules:',
    '- The list context above is authoritative. Never infer completion state from chat history.',
    '- Only say an item is done if it is marked [done] in the list context above.',
    '- If the list should change, make the tool call.',
  ].join('\n')
}
