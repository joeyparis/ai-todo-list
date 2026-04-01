'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './index'

export function useLists() {
  return useLiveQuery(() => db.lists.orderBy('updatedAt').reverse().toArray(), [])
}

export function useList(id: string) {
  return useLiveQuery(() => db.lists.get(id), [id])
}

export function useItems(listId: string) {
  return useLiveQuery(
    () => db.items.where('listId').equals(listId).sortBy('order'),
    [listId]
  )
}

export function useMessages(listId: string, limit?: number) {
  return useLiveQuery(async () => {
    const msgs = await db.messages.where('listId').equals(listId).sortBy('createdAt')
    return limit ? msgs.slice(-limit) : msgs
  }, [listId, limit])
}

export function useSettings() {
  return useLiveQuery(() => db.settings.get('settings'), [])
}
