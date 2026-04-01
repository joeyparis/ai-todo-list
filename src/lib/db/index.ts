import Dexie, { type Table } from 'dexie'
import type { List, Item, Message, Settings } from './types'

export class TodoDatabase extends Dexie {
  lists!: Table<List, string>
  items!: Table<Item, string>
  messages!: Table<Message, string>
  settings!: Table<Settings, string>

  constructor() {
    super('ai-todo-list')
    this.version(1).stores({
      lists: 'id, updatedAt',
      items: 'id, listId, order',
      messages: 'id, listId, createdAt',
      settings: 'id',
    })

    this.version(2).stores({
      lists: 'id, updatedAt',
      items: 'id, listId, order',
      messages: 'id, listId, createdAt',
      settings: 'id',
    }).upgrade(tx => {
      return tx.table('settings').toCollection().modify((setting: any) => {
        if (setting.provider && setting.apiKey) {
          setting.activeProvider = setting.provider
          setting.providerConfigs = {
            [setting.provider]: {
              apiKey: setting.apiKey,
              model: setting.model || ''
            }
          }
          delete setting.provider
          delete setting.apiKey
          delete setting.model
        }
      })
    })
  }
}

export const db = new TodoDatabase()
