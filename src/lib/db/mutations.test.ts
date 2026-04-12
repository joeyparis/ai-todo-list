import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import {
  createList, deleteList,
  addItems, completeItems, uncompleteItems, updateItem, deleteItems,
  addMessage,
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
      { text: 'Buy milk', category: 'Errands', metadata: { priority: 'high' } },
      { text: 'Call dentist' },
    ])
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('Buy milk')
    expect(items[0].category).toBe('Errands')
    expect(items[0].metadata.priority).toBe('high')
    expect(items[1].category).toBeUndefined()
    expect(items[1].metadata).toEqual({})
  })

  it('normalizes whitespace category to undefined', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Call dentist', category: '   ' }])

    expect(items[0].category).toBeUndefined()
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

  it('normalizes updated whitespace category to undefined', async () => {
    const list = await createList('Test')
    const items = await addItems(list.id, [{ text: 'Old', category: 'Work' }])

    await updateItem(items[0].id, { category: '   ' })

    const updated = await db.items.get(items[0].id)
    expect(updated?.category).toBeUndefined()
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

describe('addMessage', () => {
  it('creates message with correct fields', async () => {
    const list = await createList('Test')
    const msg = await addMessage(list.id, 'user', 'hello world')
    expect(msg.id).toBeTruthy()
    expect(msg.listId).toBe(list.id)
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('hello world')
    expect(msg.createdAt).toBeInstanceOf(Date)
    const stored = await db.messages.get(msg.id)
    expect(stored?.content).toBe('hello world')
  })

  it('stores parts string when provided', async () => {
    const list = await createList('Test')
    const parts = JSON.stringify([{ type: 'text', text: 'hi' }])
    const msg = await addMessage(list.id, 'assistant', 'hi', parts)
    const stored = await db.messages.get(msg.id)
    expect(stored?.parts).toBe(parts)
  })

  it('stores undefined parts gracefully when not provided', async () => {
    const list = await createList('Test')
    const msg = await addMessage(list.id, 'user', 'no parts')
    const stored = await db.messages.get(msg.id)
    expect(stored?.parts).toBeUndefined()
  })

  it('works for both user and assistant roles', async () => {
    const list = await createList('Test')
    const user = await addMessage(list.id, 'user', 'hello')
    const asst = await addMessage(list.id, 'assistant', 'world')
    expect(user.role).toBe('user')
    expect(asst.role).toBe('assistant')
  })
})

describe('edge cases', () => {
  it('createList with no goal stores undefined goal', async () => {
    const list = await createList('No Goal')
    expect(list.goal).toBeUndefined()
    const stored = await db.lists.get(list.id)
    expect(stored?.goal).toBeUndefined()
  })

  it('addItems with empty array returns empty array', async () => {
    const list = await createList('Test')
    const result = await addItems(list.id, [])
    expect(result).toHaveLength(0)
  })

  it('completeItems with empty array does not throw', async () => {
    await expect(completeItems([])).resolves.not.toThrow()
  })

  it('deleteItems with nonexistent IDs does not throw', async () => {
    await expect(deleteItems(['fake-id-1', 'fake-id-2'])).resolves.not.toThrow()
  })

  it('saveProviderConfig creates settings row if none exists', async () => {
    await saveProviderConfig('openai', { apiKey: 'sk-test', model: 'gpt-4o' })
    const settings = await db.settings.get('settings')
    expect(settings).toBeTruthy()
    expect(settings?.activeProvider).toBe('openai')
  })

  it('setActiveProvider when no settings exist does not throw', async () => {
    await expect(setActiveProvider('anthropic')).resolves.not.toThrow()
  })
})
