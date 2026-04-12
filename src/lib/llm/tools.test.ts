import { describe, it, expect } from 'vitest'
import { todoTools } from './tools'

describe('addItems schema', () => {
  it('accepts valid input', () => {
    const result = (todoTools.addItems.inputSchema as any).parse({
      items: [{ text: 'Buy milk', metadata: { priority: 'high' } }],
    })
    expect(result.items).toHaveLength(1)
  })

  it('rejects empty items array', () => {
    expect(() => (todoTools.addItems.inputSchema as any).parse({})).toThrow()
  })

  it('rejects missing text', () => {
    expect(() => (todoTools.addItems.inputSchema as any).parse({
      items: [{ metadata: {} }],
    })).toThrow()
  })

  it('strips unknown metadata keys silently', () => {
    const result = (todoTools.addItems.inputSchema as any).parse({
      items: [{ text: 'Buy milk', metadata: { dueDate: 'tomorrow' } }],
    })
    expect(result.items[0].metadata).toEqual({})
  })

  it('rejects metadata with invalid enum values', () => {
    expect(() => (todoTools.addItems.inputSchema as any).parse({
      items: [{ text: 'Buy milk', metadata: { priority: 'urgent' } }],
    })).toThrow()
  })
})

describe('completeItems schema', () => {
  it('accepts valid IDs', () => {
    const result = (todoTools.completeItems.inputSchema as any).parse({ itemIds: ['abc', 'def'] })
    expect(result.itemIds).toHaveLength(2)
  })

  it('rejects non-array', () => {
    expect(() => (todoTools.completeItems.inputSchema as any).parse({ itemIds: 'abc' })).toThrow()
  })
})

describe('updateItem schema', () => {
  it('accepts partial update', () => {
    const result = (todoTools.updateItem.inputSchema as any).parse({ itemId: 'abc', text: 'New text' })
    expect(result.itemId).toBe('abc')
  })

  it('rejects missing itemId', () => {
    expect(() => (todoTools.updateItem.inputSchema as any).parse({ text: 'New' })).toThrow()
  })

  it('accepts valid core metadata values', () => {
    const result = (todoTools.updateItem.inputSchema as any).parse({
      itemId: 'abc',
      metadata: {
        priority: 'medium',
        effort: 'quick',
      },
    })
    expect(result.metadata.priority).toBe('medium')
  })

  it('strips unknown metadata fields silently', () => {
    const result = (todoTools.updateItem.inputSchema as any).safeParse({
      itemId: 'abc',
      metadata: {
        priority: 'high',
        category: 'work',
      },
    })
    expect(result.success).toBe(true)
    expect(result.data.metadata.priority).toBe('high')
    expect(result.data.metadata.category).toBeUndefined()
  })
})

describe('reorderItems schema', () => {
  it('accepts valid input with multiple IDs', () => {
    const result = (todoTools.reorderItems.inputSchema as any).parse({
      itemIds: ['id1', 'id2'],
    })
    expect(result.itemIds).toHaveLength(2)
    expect(result.itemIds).toEqual(['id1', 'id2'])
  })

  it('accepts valid input with single ID', () => {
    const result = (todoTools.reorderItems.inputSchema as any).parse({
      itemIds: ['id1'],
    })
    expect(result.itemIds).toHaveLength(1)
  })

  it('rejects empty array', () => {
    expect(() => (todoTools.reorderItems.inputSchema as any).parse({ itemIds: [] })).toThrow()
  })

  it('rejects non-array', () => {
    expect(() => (todoTools.reorderItems.inputSchema as any).parse({ itemIds: 'notarray' })).toThrow()
  })

  it('rejects duplicate IDs', () => {
    expect(() => (todoTools.reorderItems.inputSchema as any).parse({ itemIds: ['id1', 'id1'] })).toThrow(
      'itemIds must not contain duplicates'
    )
  })
})

describe('addAndCompleteItems schema', () => {
  it('accepts valid input', () => {
    const result = (todoTools.addAndCompleteItems.inputSchema as any).parse({
      items: [{ text: 'Already done' }],
    })
    expect(result.items[0].text).toBe('Already done')
  })
})

describe('tool descriptions', () => {
  it('guides completion phrases to completeItems', () => {
    expect(todoTools.completeItems.description).toContain('mark as done/complete')
  })

  it('forbids using updateItem for completion status', () => {
    expect(todoTools.updateItem.description).toContain('Never use this to mark completion status')
    expect(todoTools.updateItem.description).toContain('use completeItems instead')
  })
})
