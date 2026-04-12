import { db } from '@/lib/db'
import { validateImportData, type ExportEnvelope } from '@/lib/db/export-schema'
import type { Item, List } from '@/lib/db/types'

export interface ExportOptions {
  listIds: string[]
  includeSettings: boolean
}

export async function exportData(options: ExportOptions): Promise<ExportEnvelope> {
  const { listIds, includeSettings } = options

  if (listIds.length === 0 && !includeSettings) {
    throw new Error('Nothing selected for export')
  }

  const lists: List[] = listIds.length > 0
    ? await db.lists.where('id').anyOf(listIds).toArray()
    : []

  const items: Item[] = listIds.length > 0
    ? await db.items.where('listId').anyOf(listIds).toArray()
    : []

  const serializedLists = lists.map(list => ({
    id: list.id,
    name: list.name,
    goal: list.goal,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  }))

  const serializedItems = items.map(item => ({
    id: item.id,
    listId: item.listId,
    text: item.text,
    completed: item.completed,
    completedAt: item.completedAt?.toISOString(),
    metadata: item.metadata,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    order: item.order,
  }))

  let settings: ExportEnvelope['data']['settings']
  if (includeSettings) {
    const dbSettings = await db.settings.get('settings')
    const themeRaw = localStorage.getItem('theme')
    const theme = themeRaw === 'light' || themeRaw === 'dark' ? themeRaw : undefined

    if (dbSettings) {
      settings = {
        activeProvider: dbSettings.activeProvider,
        providerConfigs: dbSettings.providerConfigs,
        ...(dbSettings.inferMetadata !== undefined ? { inferMetadata: dbSettings.inferMetadata } : {}),
        ...(theme !== undefined ? { theme } : {}),
      }
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      lists: serializedLists,
      items: serializedItems,
      ...(settings !== undefined ? { settings } : {}),
    },
  }
}

export function downloadExport(data: ExportEnvelope): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.download = 'todo-export-' + new Date().toISOString().split('T')[0] + '.json'
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Failed to read file as text'))
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read import file'))
    }

    reader.readAsText(file)
  })
}

export async function importData(
  jsonString: string,
  mode: 'merge' | 'replace'
): Promise<{ listsImported: number; itemsImported: number; settingsImported: boolean }> {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonString)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON file: ${error.message}`)
    }
    throw error
  }

  const validated = validateImportData(parsed)

  const importedLists = validated.data.lists.map((list) => ({
    ...list,
    createdAt: new Date(list.createdAt),
    updatedAt: new Date(list.updatedAt),
  }))

  const importedItems = validated.data.items.map((item) => ({
    ...item,
    completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  }))

  if (mode === 'merge') {
    const listIdMap = new Map<string, string>()
    const now = new Date()

    const newLists = importedLists.map((list) => {
      const newListId = crypto.randomUUID()
      listIdMap.set(list.id, newListId)

      return {
        ...list,
        id: newListId,
        updatedAt: now,
      }
    })

    const newItems = importedItems.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      listId: listIdMap.get(item.listId) ?? item.listId,
    }))

    await db.lists.db.transaction('rw', [db.lists, db.items, db.settings], async () => {
      if (newLists.length > 0) {
        await db.lists.bulkAdd(newLists)
      }

      if (newItems.length > 0) {
        await db.items.bulkAdd(newItems)
      }

      if (validated.data.settings) {
        await db.settings.put({ id: 'settings', ...validated.data.settings })
      }
    })

    if (validated.data.settings?.theme) {
      localStorage.setItem('theme', validated.data.settings.theme)
    }
  } else {
    await db.lists.db.transaction('rw', [db.lists, db.items, db.settings], async () => {
      await db.lists.clear()
      await db.items.clear()
      await db.settings.clear()

      if (importedLists.length > 0) {
        await db.lists.bulkAdd(importedLists)
      }

      if (importedItems.length > 0) {
        await db.items.bulkAdd(importedItems)
      }

      if (validated.data.settings) {
        await db.settings.put({ id: 'settings', ...validated.data.settings })
      }
    })

    if (validated.data.settings?.theme) {
      localStorage.setItem('theme', validated.data.settings.theme)
    } else {
      localStorage.removeItem('theme')
    }
  }

  return {
    listsImported: validated.data.lists.length,
    itemsImported: validated.data.items.length,
    settingsImported: Boolean(validated.data.settings),
  }
}
