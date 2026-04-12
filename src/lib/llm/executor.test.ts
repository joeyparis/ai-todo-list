import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { createList, addItems } from '@/lib/db/mutations'
import type { Item } from '@/lib/db/types'
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

    it('ignores item IDs from other lists', async () => {
      const localItems = await addItems(listId, [{ text: 'Local item' }])
      const otherList = await createList('Other')
      const otherItems = await addItems(otherList.id, [{ text: 'Other item' }])

      const result = await executeToolCall('completeItems', {
        itemIds: [localItems[0].id, otherItems[0].id],
      }, listId)

      expect(result.success).toBe(true)
      expect(result.itemsCompleted).toBe(1)
      expect(result.notFound).toContain(otherItems[0].id)

      const localStored = await db.items.get(localItems[0].id)
      const otherStored = await db.items.get(otherItems[0].id)
      expect(localStored?.completed).toBe(true)
      expect(otherStored?.completed).toBe(false)
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

  describe('reorderItems', () => {
    it('reorders existing items in the requested order', async () => {
      const items = await addItems(listId, [
        { text: 'First' },
        { text: 'Second' },
        { text: 'Third' },
      ])

      const result = await executeToolCall('reorderItems', {
        itemIds: [items[2].id, items[0].id, items[1].id],
      }, listId)

      expect(result).toEqual({ success: true, notFound: [] })

      const reordered = await db.items.where('listId').equals(listId).sortBy('order')
      expect(reordered.map((item: Item) => item.id)).toEqual([items[2].id, items[0].id, items[1].id])
    })

    it('reorders owned items and reports missing IDs', async () => {
      const items = await addItems(listId, [
        { text: 'First' },
        { text: 'Second' },
        { text: 'Third' },
      ])
      const otherList = await createList('Other')
      const otherItems = await addItems(otherList.id, [{ text: 'Other item' }])

      const result = await executeToolCall('reorderItems', {
        itemIds: [items[2].id, otherItems[0].id, items[1].id, 'fake-id-123', items[0].id],
      }, listId)

      expect(result).toEqual({ success: true, notFound: [otherItems[0].id, 'fake-id-123'] })

      const reordered = await db.items.where('listId').equals(listId).sortBy('order')
      expect(reordered.map((item: Item) => item.id)).toEqual([items[2].id, items[1].id, items[0].id])
    })

    it('returns all missing IDs without changing local order', async () => {
      const items = await addItems(listId, [
        { text: 'First' },
        { text: 'Second' },
      ])
      const otherList = await createList('Other')
      const otherItems = await addItems(otherList.id, [{ text: 'Other item' }])

      const result = await executeToolCall('reorderItems', {
        itemIds: [otherItems[0].id, 'fake-id-123'],
      }, listId)

      expect(result).toEqual({ success: true, notFound: [otherItems[0].id, 'fake-id-123'] })

      const unchanged = await db.items.where('listId').equals(listId).sortBy('order')
      expect(unchanged.map((item: Item) => item.id)).toEqual([items[0].id, items[1].id])
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
