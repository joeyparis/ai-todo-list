import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import {
  createList, updateList, deleteList,
  addItems, completeItems, uncompleteItems, updateItem, deleteItems,
  saveProviderConfig, setActiveProvider,
} from './mutations'

beforeEach(async () => {
  await db.lists.clear()
  await db.items.clear()
  await db.messages.clear()
  await db.settings.clear()
})

describe('createList', () => {
  it('creates a list with name and goal', async () => {
    const list = await createList('Weekend', 'Get it done')
    expect(list.name).toBe('Weekend')
    expect(list.goal).toBe('Get it done')
    expect(list.id).toBeTruthy()
    const stored = await db.lists.get(list.id)
    expect(stored?.name).toBe('Weekend')
  })
})

describe('deleteList', () => {
  it('cascade deletes items and messages', async () => {
    const list = await createList('Test')
    await addItems(list.id, [{ text: 'Item 1' }, { text: 'Item 2' }])
    await db.messages.add({ id: 'msg1', listId: list.id, role: 'user', content: 'hello', createdAt: new Date() })
    
    await deleteList(list.id)
    
    const items = await db.items.where('listId').equals(list.id).toArray()
    const messages = await db.messages.where('listId').equals(list.id).toArray()
    expect(items).toHaveLength(0)
    expect(messages).toHaveLength(0)
    expect(await db.lists.get(list.id)).toBeUndefined()
  })
})

describe('addItems', () => {
  it('adds items with metadata', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [
      { text: 'Buy milk', metadata: { priority: 'high', location: 'Store' } },
      { text: 'Call dentist' },
    ])
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('Buy milk')
    expect(items[0].metadata.priority).toBe('high')
    expect(items[1].metadata).toEqual({})
  })

  it('adds items as completed when flag set', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Already done', completed: true }])
    expect(items[0].completed).toBe(true)
    expect(items[0].completedAt).toBeTruthy()
  })
})

describe('completeItems', () => {
  it('marks items as completed', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Todo' }])
    await completeItems([items[0].id])
    const updated = await db.items.get(items[0].id)
    expect(updated?.completed).toBe(true)
    expect(updated?.completedAt).toBeTruthy()
  })
})

describe('uncompleteItems', () => {
  it('marks items as incomplete', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Todo', completed: true }])
    await uncompleteItems([items[0].id])
    const updated = await db.items.get(items[0].id)
    expect(updated?.completed).toBe(false)
  })
})

describe('updateItem', () => {
  it('updates text and metadata', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Old', metadata: { priority: 'low' } }])
    await updateItem(items[0].id, { text: 'New', metadata: { priority: 'high' } })
    const updated = await db.items.get(items[0].id)
    expect(updated?.text).toBe('New')
    expect(updated?.metadata.priority).toBe('high')
  })
})

describe('deleteItems', () => {
  it('removes items', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'A' }, { text: 'B' }])
    await deleteItems([items[0].id])
    const remaining = await db.items.where('listId').equals(list.id).toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].text).toBe('B')
  })
})

describe('settings', () => {
  it('saves and retrieves provider config', async () => {
    await saveProviderConfig('openai', { apiKey: 'sk-test', model: 'gpt-4o' })
    const settings = await db.settings.get('settings')
    expect(settings?.providerConfigs.openai.apiKey).toBe('sk-test')
  })

  it('sets active provider', async () => {
    await saveProviderConfig('openai', { apiKey: 'sk-test', model: 'gpt-4o' })
    await setActiveProvider('anthropic')
    const settings = await db.settings.get('settings')
    expect(settings?.activeProvider).toBe('anthropic')
  })
})
