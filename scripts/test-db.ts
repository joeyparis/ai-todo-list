import 'fake-indexeddb/auto'
import { db } from '../src/lib/db/index'
import {
  createList,
  addItems,
  completeItems,
  uncompleteItems,
  updateItem,
  deleteItems,
  addMessage,
  saveSettings,
  deleteList,
  updateList,
} from '../src/lib/db/mutations'

async function run() {
  console.log('Running database tests...\n')

  // Scenario 1: createList and read back
  {
    const list = await createList('Test List', 'Test goal')
    if (!list.id) throw new Error('List has no id')
    if (list.name !== 'Test List') throw new Error(`Expected name 'Test List', got '${list.name}'`)
    if (list.goal !== 'Test goal') throw new Error(`Expected goal 'Test goal', got '${list.goal}'`)
    if (!(list.createdAt instanceof Date)) throw new Error('createdAt is not a Date')

    const all = await db.lists.toArray()
    if (all.length !== 1) throw new Error(`Expected 1 list, got ${all.length}`)
    if (all[0].name !== 'Test List') throw new Error('List name mismatch in DB')

    console.log('✓ createList - creates list with correct fields')

    await deleteList(list.id)
    const afterDelete = await db.lists.toArray()
    if (afterDelete.length !== 0) throw new Error('List not deleted')
    console.log('✓ deleteList - removes the list')
  }

  // Scenario 2: updateList
  {
    const list = await createList('Original Name')
    await new Promise(r => setTimeout(r, 5))
    await updateList(list.id, { name: 'Updated Name', goal: 'New goal' })
    const updated = await db.lists.get(list.id)
    if (!updated) throw new Error('List not found after update')
    if (updated.name !== 'Updated Name') throw new Error('Name not updated')
    if (updated.goal !== 'New goal') throw new Error('Goal not updated')
    if (updated.updatedAt <= list.updatedAt) throw new Error('updatedAt not bumped')
    console.log('✓ updateList - updates name and goal, bumps updatedAt')
    await deleteList(list.id)
  }

  // Scenario 3: addItems with metadata
  {
    const list = await createList('Items Test')
    const items = await addItems(list.id, [
      { text: 'Buy milk', metadata: { priority: 'high', location: 'Publix' } },
      { text: 'Return package', metadata: {} },
      { text: 'Already done', completed: true },
    ])

    if (items.length !== 3) throw new Error(`Expected 3 items, got ${items.length}`)
    if (items[0].text !== 'Buy milk') throw new Error('Item 0 text mismatch')
    if (items[0].metadata.priority !== 'high') throw new Error('Item 0 metadata missing priority')
    if (items[0].metadata.location !== 'Publix') throw new Error('Item 0 metadata missing location')
    if (items[0].order !== 0) throw new Error('Item 0 order should be 0')
    if (items[1].order !== 1) throw new Error('Item 1 order should be 1')
    if (items[2].order !== 2) throw new Error('Item 2 order should be 2')
    if (items[2].completed !== true) throw new Error('Item 2 should be completed')
    if (!items[2].completedAt) throw new Error('Item 2 completedAt should be set')
    if (items[0].completed !== false) throw new Error('Item 0 should not be completed')
    if (items[0].completedAt !== undefined) throw new Error('Item 0 completedAt should be undefined')

    console.log('✓ addItems - creates items with correct fields, metadata, order, and completion state')

    const moreItems = await addItems(list.id, [{ text: 'Fourth item', metadata: {} }])
    if (moreItems[0].order !== 3) throw new Error(`Expected order 3 for subsequent add, got ${moreItems[0].order}`)
    console.log('✓ addItems - subsequent adds increment order correctly')

    // Scenario 4: completeItems
    const [item0, item1] = items
    await completeItems([item0.id, item1.id])
    const completed0 = await db.items.get(item0.id)
    const completed1 = await db.items.get(item1.id)
    if (!completed0?.completed) throw new Error('Item 0 should be completed')
    if (!completed1?.completed) throw new Error('Item 1 should be completed')
    if (!completed0.completedAt) throw new Error('Item 0 completedAt should be set')
    console.log('✓ completeItems - marks items as completed with completedAt timestamp')

    // Scenario 5: uncompleteItems
    await uncompleteItems([item0.id])
    const uncompleted = await db.items.get(item0.id)
    if (uncompleted?.completed !== false) throw new Error('Item 0 should be uncompleted')
    if (uncompleted.completedAt !== undefined) throw new Error('Item 0 completedAt should be cleared')
    console.log('✓ uncompleteItems - reverts completion and clears completedAt')

    // Scenario 6: updateItem
    await updateItem(item1.id, { text: 'Updated text', metadata: { effort: 'quick' } })
    const updatedItem = await db.items.get(item1.id)
    if (updatedItem?.text !== 'Updated text') throw new Error('Item text not updated')
    if (updatedItem.metadata.effort !== 'quick') throw new Error('Item metadata not updated')
    console.log('✓ updateItem - updates text and metadata')

    // Scenario 7: deleteItems
    await deleteItems([item0.id])
    const deletedItem = await db.items.get(item0.id)
    if (deletedItem !== undefined) throw new Error('Item 0 should be deleted')
    console.log('✓ deleteItems - removes specified items')

    await deleteList(list.id)
  }

  // Scenario 8: addMessage
  {
    const list = await createList('Messages Test')
    const msg = await addMessage(list.id, 'user', 'Hello world', JSON.stringify([{ type: 'text', text: 'Hello world' }]))
    if (!msg.id) throw new Error('Message has no id')
    if (msg.role !== 'user') throw new Error('Wrong role')
    if (msg.content !== 'Hello world') throw new Error('Wrong content')
    if (!msg.parts) throw new Error('Parts should be set')

    const assistantMsg = await addMessage(list.id, 'assistant', 'How can I help?')
    if (assistantMsg.role !== 'assistant') throw new Error('Wrong assistant role')
    if (assistantMsg.parts !== undefined) throw new Error('Parts should be undefined when not provided')

    const allMsgs = await db.messages.where('listId').equals(list.id).toArray()
    if (allMsgs.length !== 2) throw new Error(`Expected 2 messages, got ${allMsgs.length}`)
    console.log('✓ addMessage - creates messages with correct fields')

    await deleteList(list.id)
  }

  // Scenario 9: saveSettings
  {
    await saveSettings({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' })
    const settings = await db.settings.get('settings')
    if (!settings) throw new Error('Settings not found')
    if (settings.id !== 'settings') throw new Error('Settings id should be "settings"')
    if (settings.provider !== 'openai') throw new Error('Wrong provider')
    if (settings.apiKey !== 'sk-test') throw new Error('Wrong apiKey')
    if (settings.model !== 'gpt-4o-mini') throw new Error('Wrong model')

    await saveSettings({ provider: 'anthropic', apiKey: 'sk-ant-test', model: 'claude-sonnet-4-20250514' })
    const updated = await db.settings.get('settings')
    if (updated?.provider !== 'anthropic') throw new Error('Settings not updated - still old provider')
    const count = await db.settings.count()
    if (count !== 1) throw new Error(`Expected 1 settings record, got ${count} (saveSettings should upsert)`)
    console.log('✓ saveSettings - upserts singleton settings record')
  }

  // Scenario 10: cascade deleteList removes items and messages
  {
    const list = await createList('Cascade Test')
    await addItems(list.id, [
      { text: 'Item A', metadata: {} },
      { text: 'Item B', metadata: {} },
    ])
    await addMessage(list.id, 'user', 'Test message')

    const itemsBefore = await db.items.where('listId').equals(list.id).toArray()
    if (itemsBefore.length !== 2) throw new Error('Expected 2 items before delete')
    const msgsBefore = await db.messages.where('listId').equals(list.id).toArray()
    if (msgsBefore.length !== 1) throw new Error('Expected 1 message before delete')

    await deleteList(list.id)

    const listAfter = await db.lists.get(list.id)
    if (listAfter !== undefined) throw new Error('List should be deleted')
    const itemsAfter = await db.items.where('listId').equals(list.id).toArray()
    if (itemsAfter.length !== 0) throw new Error(`Expected 0 items after cascade delete, got ${itemsAfter.length}`)
    const msgsAfter = await db.messages.where('listId').equals(list.id).toArray()
    if (msgsAfter.length !== 0) throw new Error(`Expected 0 messages after cascade delete, got ${msgsAfter.length}`)

    console.log('✓ deleteList - cascades to remove items and messages')
  }

  // Scenario 11: useLists ordering (updatedAt desc)
  {
    const list1 = await createList('List One')
    await new Promise(r => setTimeout(r, 10))
    const list2 = await createList('List Two')

    const lists = await db.lists.orderBy('updatedAt').reverse().toArray()
    if (lists[0].id !== list2.id) throw new Error('Lists not sorted by updatedAt desc')
    if (lists[1].id !== list1.id) throw new Error('Second list ordering wrong')
    console.log('✓ lists table - orderBy updatedAt desc works correctly')

    await deleteList(list1.id)
    await deleteList(list2.id)
  }

  console.log('\nAll tests passed!')
}

run().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
