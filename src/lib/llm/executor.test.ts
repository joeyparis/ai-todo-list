import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { createList, addItems } from '@/lib/db/mutations'
import { executeToolCall } from './executor'

let listId: string

beforeEach(async () => {
  await db.lists.clear()
  await db.items.clear()
  await db.messages.clear()
  await db.settings.clear()
  const list = await createList('Test')
  listId = list.id
})

describe('executeToolCall', () => {
  describe('addItems', () => {
    it('creates items in database', async () => {
      const result = await executeToolCall('addItems', {
        items: [
          { text: 'Buy milk', metadata: { priority: 'high' } },
          { text: 'Buy eggs' },
        ],
      }, listId)
      expect(result.success).toBe(true)
      expect(result.itemsAdded).toBe(2)
      const items = await db.items.where('listId').equals(listId).toArray()
      expect(items).toHaveLength(2)
    })
  })

  describe('completeItems', () => {
    it('completes existing items', async () => {
      const items = await addItems(listId, [{ text: 'Todo' }])
      const result = await executeToolCall('completeItems', { itemIds: [items[0].id] }, listId)
      expect(result.success).toBe(true)
      expect(result.itemsCompleted).toBe(1)
    })

    it('reports nonexistent IDs without crashing', async () => {
      const items = await addItems(listId, [{ text: 'Real' }])
      const result = await executeToolCall('completeItems', {
        itemIds: [items[0].id, 'fake-id-123'],
      }, listId)
      expect(result.success).toBe(true)
      expect(result.itemsCompleted).toBe(1)
      expect(result.notFound).toContain('fake-id-123')
    })
  })

  describe('addAndCompleteItems', () => {
    it('adds items already marked as done', async () => {
      const result = await executeToolCall('addAndCompleteItems', {
        items: [{ text: 'Already walked the dog' }],
      }, listId)
      expect(result.success).toBe(true)
      const items = await db.items.where('listId').equals(listId).toArray()
      expect(items[0].completed).toBe(true)
    })
  })

  describe('validation', () => {
    it('rejects invalid arguments', async () => {
      const result = await executeToolCall('addItems', { bad: 'data' } as any, listId)
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
      const items = await db.items.where('listId').equals(listId).toArray()
      expect(items).toHaveLength(0)
    })

    it('rejects unknown tool name', async () => {
      const result = await executeToolCall('fakeTool', {}, listId)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown tool')
    })
  })
})
