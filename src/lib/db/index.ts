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
  }
}

export const db = new TodoDatabase()
