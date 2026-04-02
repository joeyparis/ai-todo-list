import { db } from '@/lib/db'
import type { ExportEnvelope } from '@/lib/db/export-schema'

export interface ExportOptions {
  listIds: string[]
  includeSettings: boolean
}

export async function exportData(options: ExportOptions): Promise<ExportEnvelope> {
  const { listIds, includeSettings } = options

  if (listIds.length === 0 && !includeSettings) {
    throw new Error('Nothing selected for export')
  }

  const lists = listIds.length > 0
    ? await db.lists.where('id').anyOf(listIds).toArray()
    : []

  const items = listIds.length > 0
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
