import { beforeEach, describe, it, expect, vi } from 'vitest'
import { db } from '@/lib/db'
import { createList, addItems, saveProviderConfig } from '@/lib/db/mutations'
import { exportData, importData } from '@/lib/db/export-import'

beforeEach(async () => {
  await db.lists.clear()
  await db.items.clear()
  await db.settings.clear()
  await db.messages.clear()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
})

function makeEnvelopeJson(overrides: {
  lists?: Array<{ id: string; name: string; createdAt: string; updatedAt: string; goal?: string }>
  items?: Array<{
    id: string
    listId: string
    text: string
    completed: boolean
    metadata: Record<string, unknown>
    createdAt: string
    updatedAt: string
    order: number
    completedAt?: string
  }>
  settings?: { activeProvider: string; providerConfigs: Record<string, { apiKey: string; model: string }>; theme?: 'light' | 'dark' }
} = {}) {
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      lists: overrides.lists ?? [],
      items: overrides.items ?? [],
      ...(overrides.settings !== undefined ? { settings: overrides.settings } : {}),
    },
  })
}

function makeListEntry(id: string, name: string) {
  const ts = new Date().toISOString()
  return { id, name, createdAt: ts, updatedAt: ts }
}

describe('exportData', () => {
  it('full export: 2 lists with 3 items each returns 2 lists and 6 items', async () => {
    const list1 = await createList('List A')
    const list2 = await createList('List B')
    await addItems(list1.id, [{ text: 'A1' }, { text: 'A2' }, { text: 'A3' }])
    await addItems(list2.id, [{ text: 'B1' }, { text: 'B2' }, { text: 'B3' }])

    const result = await exportData({ listIds: [list1.id, list2.id], includeSettings: false })

    expect(result.data.lists).toHaveLength(2)
    expect(result.data.items).toHaveLength(6)
  })

  it('selective export: only requested lists and their items included', async () => {
    const list1 = await createList('A')
    const list2 = await createList('B')
    const list3 = await createList('C')
    await addItems(list1.id, [{ text: 'A1' }])
    await addItems(list2.id, [{ text: 'B1' }])
    await addItems(list3.id, [{ text: 'C1' }])

    const result = await exportData({ listIds: [list1.id, list2.id], includeSettings: false })

    expect(result.data.lists).toHaveLength(2)
    const exportedIds = result.data.lists.map((l) => l.id)
    for (const item of result.data.items) {
      expect(exportedIds).toContain(item.listId)
    }
    expect(result.data.items).toHaveLength(2)
  })

  it('settings-only export: lists and items empty, settings present', async () => {
    await saveProviderConfig('openai', { apiKey: 'sk-test', model: 'gpt-4o' })

    const result = await exportData({ listIds: [], includeSettings: true })

    expect(result.data.lists).toHaveLength(0)
    expect(result.data.items).toHaveLength(0)
    expect(result.data.settings).toBeDefined()
    expect(result.data.settings?.activeProvider).toBe('openai')
  })

  it('empty selection throws when neither lists nor settings selected', async () => {
    await expect(exportData({ listIds: [], includeSettings: false })).rejects.toThrow('Nothing selected for export')
  })

  it('export does not include messages field in data', async () => {
    const list = await createList('Test')
    await db.messages.add({ id: 'msg-1', listId: list.id, role: 'user', content: 'hi', createdAt: new Date() })

    const result = await exportData({ listIds: [list.id], includeSettings: false })

    expect('messages' in result.data).toBe(false)
  })

  it('all date fields in lists and items are strings', async () => {
    const list = await createList('Dates')
    await addItems(list.id, [{ text: 'Item' }])

    const result = await exportData({ listIds: [list.id], includeSettings: false })

    expect(typeof result.data.lists[0].createdAt).toBe('string')
    expect(typeof result.data.lists[0].updatedAt).toBe('string')
    expect(typeof result.data.items[0].createdAt).toBe('string')
    expect(typeof result.data.items[0].updatedAt).toBe('string')
  })
})

describe('importData - merge mode', () => {
  it('merge adds imported list alongside existing lists', async () => {
    await createList('Existing')

    const json = makeEnvelopeJson({ lists: [makeListEntry('new-id', 'Imported')] })
    await importData(json, 'merge')

    const all = await db.lists.toArray()
    expect(all).toHaveLength(2)
  })

  it('merge assigns new UUIDs to imported lists', async () => {
    const originalId = 'original-list-id'
    const json = makeEnvelopeJson({ lists: [makeListEntry(originalId, 'Imported')] })

    await importData(json, 'merge')

    const all = await db.lists.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].id).not.toBe(originalId)
  })
})

describe('importData - replace mode', () => {
  it('replace wipes existing lists and inserts imported ones', async () => {
    await createList('Existing 1')
    await createList('Existing 2')

    const json = makeEnvelopeJson({ lists: [makeListEntry('new-id', 'Imported')] })
    await importData(json, 'replace')

    const all = await db.lists.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Imported')
  })

  it('replace does not clear messages table', async () => {
    const list = await createList('With Messages')
    await db.messages.add({ id: 'msg-1', listId: list.id, role: 'user', content: 'hello', createdAt: new Date() })

    const json = makeEnvelopeJson({ lists: [makeListEntry('new-id', 'Imported')] })
    await importData(json, 'replace')

    const messages = await db.messages.toArray()
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe('msg-1')
  })
})

describe('importData - validation', () => {
  it('invalid JSON throws error mentioning Invalid JSON', async () => {
    await expect(importData('bad json', 'merge')).rejects.toThrow('Invalid JSON')
  })

  it('bad schema version throws ZodError', async () => {
    const json = JSON.stringify({ version: 99 })
    await expect(importData(json, 'merge')).rejects.toThrow()
  })

  it('orphaned item listId throws referential integrity error', async () => {
    const json = makeEnvelopeJson({
      lists: [makeListEntry('list-1', 'List')],
      items: [
        {
          id: 'item-1',
          listId: 'non-existent-list',
          text: 'Orphan',
          completed: false,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: 0,
        },
      ],
    })
    await expect(importData(json, 'merge')).rejects.toThrow(/unknown list ID/)
  })
})

describe('importData - date round-trip', () => {
  it('exported dates survive JSON round-trip as Date instances in DB', async () => {
    const list = await createList('Round-trip')
    await addItems(list.id, [{ text: 'Item' }])

    const exported = await exportData({ listIds: [list.id], includeSettings: false })
    const json = JSON.stringify(exported)

    await importData(json, 'replace')

    const lists = await db.lists.toArray()
    expect(lists).toHaveLength(1)
    expect(lists[0].createdAt).toBeInstanceOf(Date)
    expect(lists[0].updatedAt).toBeInstanceOf(Date)

    const items = await db.items.toArray()
    expect(items[0].createdAt).toBeInstanceOf(Date)
  })
})

describe('importData - settings and atomicity', () => {
  it('replace import: settings overwrite activeProvider and providerConfigs', async () => {
    await db.settings.put({ id: 'settings', activeProvider: 'openai', providerConfigs: { openai: { apiKey: 'old-key', model: 'gpt-4o' } } })

    const json = makeEnvelopeJson({
      lists: [],
      items: [],
      settings: { activeProvider: 'anthropic', providerConfigs: { anthropic: { apiKey: 'new-key', model: 'claude-sonnet-4-20250514' } } }
    })

    await importData(json, 'replace')

    const settings = await db.settings.get('settings')
    expect(settings?.activeProvider).toBe('anthropic')
    expect(settings?.providerConfigs.anthropic?.apiKey).toBe('new-key')
  })

  it('import with theme: sets localStorage theme', async () => {
    const setItemMock = vi.fn()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: setItemMock,
      removeItem: vi.fn(),
    })

    const json = makeEnvelopeJson({
      lists: [],
      items: [],
      settings: { activeProvider: 'openai', providerConfigs: { openai: { apiKey: 'sk-test', model: 'gpt-4o' } }, theme: 'dark' }
    })

    await importData(json, 'replace')

    expect(setItemMock).toHaveBeenCalledWith('theme', 'dark')
  })

  it('validation failure leaves DB unchanged (atomicity)', async () => {
    const list = await createList('Existing List')

    const badJson = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        lists: [{ id: 'list-a', name: 'A', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        items: [{ id: 'item-1', listId: 'non-existent-list-id', text: 'Orphan', completed: false, metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), order: 0 }]
      }
    })

    await expect(importData(badJson, 'merge')).rejects.toThrow()

    const lists = await db.lists.toArray()
    expect(lists).toHaveLength(1)
    expect(lists[0].id).toBe(list.id)
  })
})
