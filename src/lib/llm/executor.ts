import { z } from 'zod'
import { db } from '@/lib/db'
import {
  addItems as addItemsMutation,
  completeItems as completeItemsMutation,
  uncompleteItems as uncompleteItemsMutation,
  updateItem as updateItemMutation,
  deleteItems as deleteItemsMutation,
  reorderItems as reorderItemsMutation,
} from '@/lib/db/mutations'
import type { Item } from '@/lib/db/types'
import { todoTools } from './tools'

export interface ToolResult {
  success: boolean
  error?: string
  itemsAdded?: number
  itemsCompleted?: number
  itemsUncompleted?: number
  itemsUpdated?: number
  itemsDeleted?: number
  notFound?: string[]
}

function cleanItemText(text: string): string {
  // Strip metadata that was accidentally concatenated into text
  // Pattern: "Task name | key:value, key:value, ..."
  return text.replace(/\s*\|.*$/, '').trim()
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

async function splitExistingAndMissingIds(itemIds: string[], listId: string): Promise<{ existingIds: string[]; missingIds: string[] }> {
  const existing = await db.items.where('id').anyOf(itemIds).toArray()
  const existingIdSet = new Set(existing.filter((item: Item) => item.listId === listId).map((item: Item) => item.id))
  const existingIds = itemIds.filter(id => existingIdSet.has(id))
  const missingIds = itemIds.filter(id => !existingIdSet.has(id))
  return { existingIds, missingIds }
}

export async function executeToolCall(
  toolName: string,
  args: unknown,
  listId: string
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'addItems': {
        const parsed = (todoTools.addItems as any).inputSchema.parse(args)
        const cleanedItems = parsed.items.map((item: any) => ({ ...item, text: cleanItemText(item.text) }))
        await addItemsMutation(listId, cleanedItems)
        return { success: true, itemsAdded: cleanedItems.length }
      }

      case 'completeItems': {
        const parsed = (todoTools.completeItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds, listId)
        if (existingIds.length > 0) {
          await completeItemsMutation(existingIds)
        }
        return { success: true, itemsCompleted: existingIds.length, notFound: missingIds }
      }

      case 'uncompleteItems': {
        const parsed = (todoTools.uncompleteItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds, listId)
        if (existingIds.length > 0) {
          await uncompleteItemsMutation(existingIds)
        }
        return { success: true, itemsUncompleted: existingIds.length, notFound: missingIds }
      }

      case 'updateItem': {
        const parsed = (todoTools.updateItem as any).inputSchema.parse(args)
        const item = await db.items.get(parsed.itemId)
        if (!item || item.listId !== listId) {
          return { success: false, error: 'Item not found', notFound: [parsed.itemId] }
        }

        const fields: { text?: string; metadata?: Record<string, unknown> } = {}
        if (parsed.text !== undefined) {
          fields.text = cleanItemText(parsed.text)
        }
        if (parsed.metadata !== undefined) {
          fields.metadata = parsed.metadata
        }

        await updateItemMutation(parsed.itemId, fields)
        return { success: true, itemsUpdated: 1 }
      }

      case 'updateItems': {
        const parsed = (todoTools.updateItems as any).inputSchema.parse(args)
        let updatedCount = 0
        const missing: string[] = []
        for (const update of parsed.updates) {
          const item = await db.items.get(update.itemId)
          if (!item || item.listId !== listId) {
            missing.push(update.itemId)
            continue
          }
          await updateItemMutation(update.itemId, { metadata: update.metadata })
          updatedCount++
        }
        return { success: true, itemsUpdated: updatedCount, notFound: missing }
      }

      case 'deleteItems': {
        const parsed = (todoTools.deleteItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds, listId)
        if (existingIds.length > 0) {
          await deleteItemsMutation(existingIds)
        }
        return { success: true, itemsDeleted: existingIds.length, notFound: missingIds }
      }

      case 'reorderItems': {
        const parsed = (todoTools.reorderItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds, listId)
        if (existingIds.length > 0) {
          await reorderItemsMutation(listId, existingIds)
        }
        return { success: true, notFound: missingIds }
      }

      case 'addAndCompleteItems': {
        const parsed = (todoTools.addAndCompleteItems as any).inputSchema.parse(args)
        const cleanedItems = parsed.items.map((item: any) => ({ ...item, text: cleanItemText(item.text), completed: true }))
        await addItemsMutation(listId, cleanedItems)
        return { success: true, itemsAdded: cleanedItems.length }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: `Invalid arguments: ${err.message}` }
    }
    return { success: false, error: getErrorMessage(err) }
  }
}

export async function processToolInvocations(
  toolInvocations: Array<{ toolName: string; args: unknown }>,
  listId: string
): Promise<ToolResult[]> {
  const results: ToolResult[] = []
  for (const invocation of toolInvocations) {
    results.push(await executeToolCall(invocation.toolName, invocation.args, listId))
  }
  return results
}
