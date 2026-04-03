import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { validateImportData } from './export-schema'

function validEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    exportedAt: '2024-01-01T00:00:00.000Z',
    data: {
      lists: [
        {
          id: 'list-1',
          name: 'Test List',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      items: [],
    },
    ...overrides,
  }
}

describe('validateImportData', () => {
  it('valid full envelope passes without throwing', () => {
    expect(() => validateImportData(validEnvelope())).not.toThrow()
    const result = validateImportData(validEnvelope())
    expect(result.version).toBe(1)
    expect(result.data.lists).toHaveLength(1)
  })

  it('missing version throws ZodError', () => {
    const data = {
      exportedAt: '2024-01-01T00:00:00.000Z',
      data: { lists: [], items: [] },
    }
    expect(() => validateImportData(data)).toThrow(ZodError)
  })

  it('version 2 throws ZodError (must be literal 1)', () => {
    expect(() => validateImportData(validEnvelope({ version: 2 }))).toThrow(ZodError)
  })

  it('invalid exportedAt date string throws ZodError', () => {
    expect(() => validateImportData(validEnvelope({ exportedAt: 'not-a-date' }))).toThrow(ZodError)
  })

  it('settings field absent is still valid', () => {
    const envelope = validEnvelope()
    expect(() => validateImportData(envelope)).not.toThrow()
    const result = validateImportData(envelope)
    expect(result.data.settings).toBeUndefined()
  })

  it('settings with theme dark is valid', () => {
    const envelope = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      data: {
        lists: [],
        items: [],
        settings: {
          activeProvider: 'openai',
          providerConfigs: { openai: { apiKey: 'sk-test', model: 'gpt-4o' } },
          theme: 'dark',
        },
      },
    }
    expect(() => validateImportData(envelope)).not.toThrow()
    const result = validateImportData(envelope)
    expect(result.data.settings?.theme).toBe('dark')
  })

  it('item with listId not in lists throws Error (not ZodError)', () => {
    const envelope = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      data: {
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        items: [
          {
            id: 'item-1',
            listId: 'non-existent-list',
            text: 'Orphan item',
            completed: false,
            metadata: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            order: 0,
          },
        ],
      },
    }

    let caught: unknown
    try {
      validateImportData(envelope)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeDefined()
    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(ZodError)
    expect((caught as Error).message).toContain('unknown list ID')
  })

  it('metadata accepts nested objects, numbers, and strings', () => {
    const envelope = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      data: {
        lists: [
          {
            id: 'list-1',
            name: 'Test',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        items: [
          {
            id: 'item-1',
            listId: 'list-1',
            text: 'Item with rich metadata',
            completed: false,
            metadata: {
              priority: 'high',
              score: 42,
              nested: { key: 'value', tags: ['a', 'b'] },
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            order: 0,
          },
        ],
      },
    }
    expect(() => validateImportData(envelope)).not.toThrow()
    const result = validateImportData(envelope)
    expect(result.data.items[0].metadata.priority).toBe('high')
    expect(result.data.items[0].metadata.score).toBe(42)
    expect((result.data.items[0].metadata.nested as Record<string, unknown>).key).toBe('value')
  })
})
