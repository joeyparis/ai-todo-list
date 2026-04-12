import { db } from './index'
import type { List, Item, Message, Settings } from './types'

export async function createList(name: string, goal?: string): Promise<List> {
  const list: List = {
    id: crypto.randomUUID(),
    name,
    goal,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.lists.add(list)
  return list
}

export async function updateList(id: string, fields: Partial<Pick<List, 'name' | 'goal'>>): Promise<void> {
  await db.lists.update(id, { ...fields, updatedAt: new Date() })
}

export async function deleteList(id: string): Promise<void> {
  await db.transaction('rw', [db.lists, db.items, db.messages], async () => {
    await db.lists.delete(id)
    await db.items.where('listId').equals(id).delete()
    await db.messages.where('listId').equals(id).delete()
  })
}

export async function addItems(
  listId: string,
  items: Array<{ text: string; metadata?: Record<string, unknown>; completed?: boolean }>
): Promise<Item[]> {
  const existingCount = await db.items.where('listId').equals(listId).count()
  const now = new Date()
  const newItems: Item[] = items.map((item, idx) => ({
    id: crypto.randomUUID(),
    listId,
    text: item.text,
    completed: item.completed ?? false,
    completedAt: item.completed ? now : undefined,
    metadata: item.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    order: existingCount + idx,
  }))
  await db.items.bulkAdd(newItems)
  await db.lists.update(listId, { updatedAt: now })
  return newItems
}

export async function completeItems(ids: string[]): Promise<void> {
  const now = new Date()
  await db.items.bulkUpdate(ids.map(id => ({ key: id, changes: { completed: true, completedAt: now, updatedAt: now } })))
}

export async function uncompleteItems(ids: string[]): Promise<void> {
  const now = new Date()
  await db.items.bulkUpdate(ids.map(id => ({ key: id, changes: { completed: false, completedAt: undefined, updatedAt: now } })))
}

export async function updateItem(id: string, fields: Partial<Pick<Item, 'text' | 'metadata'>>): Promise<void> {
  await db.items.update(id, { ...fields, updatedAt: new Date() })
}

export async function deleteItems(ids: string[]): Promise<void> {
  await db.items.bulkDelete(ids)
}

export async function addMessage(
  listId: string,
  role: 'user' | 'assistant',
  content: string,
  parts?: string
): Promise<Message> {
  const msg: Message = {
    id: crypto.randomUUID(),
    listId,
    role,
    content,
    parts,
    createdAt: new Date(),
  }
  await db.messages.add(msg)
  return msg
}

export async function saveSettings(settings: Omit<Settings, 'id'>): Promise<void> {
  await db.settings.put({ id: 'settings', ...settings })
}

export async function saveProviderConfig(provider: string, config: { apiKey: string; model: string }): Promise<void> {
  const existing = await db.settings.get('settings')
  const providerConfigs = existing?.providerConfigs ?? {}
  providerConfigs[provider] = config

  await db.settings.put({
    id: 'settings',
    activeProvider: existing?.activeProvider ?? provider,
    providerConfigs,
    inferMetadata: existing?.inferMetadata,
  })
}

export async function saveInferMetadata(value: boolean): Promise<void> {
  const existing = await db.settings.get('settings')

  await db.settings.put({
    id: 'settings',
    activeProvider: existing?.activeProvider ?? 'openai',
    providerConfigs: existing?.providerConfigs ?? {},
    inferMetadata: value,
  })
}

export async function setActiveProvider(provider: string): Promise<void> {
  const existing = await db.settings.get('settings')
  if (existing) {
    await db.settings.update('settings', { activeProvider: provider })
  }
}

export async function reorderItems(listId: string, orderedIds: string[]): Promise<void> {
  const now = new Date()
  await db.items.bulkUpdate(
    orderedIds.map((id, index) => ({ key: id, changes: { order: index, updatedAt: now } }))
  )
}

export async function clearMessages(listId: string): Promise<void> {
  await db.messages.where('listId').equals(listId).delete()
}
