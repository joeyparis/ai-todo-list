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

  it('rejects metadata with unknown keys', () => {
    expect(() => (todoTools.addItems.inputSchema as any).parse({
      items: [{ text: 'Buy milk', metadata: { dueDate: 'tomorrow' } }],
    })).toThrow()
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
        category: 'admin',
        location: 'computer',
        skipability: 'must-do',
      },
    })
    expect(result.metadata.priority).toBe('medium')
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
