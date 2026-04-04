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

export function buildSystemPrompt(list: ListContext, items: ItemContext[]): string {
  const listState = serializeListState(list, items)

  return [
    'You are a todo list manager. Your ONLY job is to take action on the list via tool calls.',
    'If the user wants to change the list, call a tool. Do not describe what you would do - do it.',
    'Text alone does not change the list. Only tool calls change the list.',
    '',
    'Current list:',
    listState,
    '',
    'When adding or updating items:',
    '- Always include metadata: infer priority (high/medium/low), effort (quick/medium/long), category, location, skipability (must-do/nice-to-have/optional) from context.',
    '- Metadata goes in the metadata field of the tool call, not in the item text.',
    '',
    'State rules:',
    '- The list context above is authoritative. Never infer completion state from chat history.',
    '- Only say an item is done if it is marked [done] in the list context above.',
    '',
    'When to ask vs act:',
    '- If a request clearly matches one item, call the tool.',
    '- If a request is ambiguous or could match multiple items, ask which one.',
    '- For questions about what to do next or prioritization advice, respond without a tool call.',
    '- When asked to reprioritize, recategorize, or review the list, use updateItems to update all items that need changes in a single call.',
    '',
    'Remember: call tools to change the list. Text does not change the list.',
  ].join('\n')
}
