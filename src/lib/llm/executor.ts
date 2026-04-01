import { z } from 'zod'
import { db } from '@/lib/db'
import {
  addItems as addItemsMutation,
  completeItems as completeItemsMutation,
  uncompleteItems as uncompleteItemsMutation,
  updateItem as updateItemMutation,
  deleteItems as deleteItemsMutation,
} from '@/lib/db/mutations'
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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

async function splitExistingAndMissingIds(itemIds: string[]): Promise<{ existingIds: string[]; missingIds: string[] }> {
  const existing = await db.items.where('id').anyOf(itemIds).toArray()
  const existingIdSet = new Set(existing.map(item => item.id))
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
        await addItemsMutation(listId, parsed.items)
        return { success: true, itemsAdded: parsed.items.length }
      }

      case 'completeItems': {
        const parsed = (todoTools.completeItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds)
        if (existingIds.length > 0) {
          await completeItemsMutation(existingIds)
        }
        return { success: true, itemsCompleted: existingIds.length, notFound: missingIds }
      }

      case 'uncompleteItems': {
        const parsed = (todoTools.uncompleteItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds)
        if (existingIds.length > 0) {
          await uncompleteItemsMutation(existingIds)
        }
        return { success: true, itemsUncompleted: existingIds.length, notFound: missingIds }
      }

      case 'updateItem': {
        const parsed = (todoTools.updateItem as any).inputSchema.parse(args)
        const item = await db.items.get(parsed.itemId)
        if (!item) {
          return { success: false, error: 'Item not found', notFound: [parsed.itemId] }
        }

        const fields: { text?: string; metadata?: Record<string, unknown> } = {}
        if (parsed.text !== undefined) {
          fields.text = parsed.text
        }
        if (parsed.metadata !== undefined) {
          fields.metadata = parsed.metadata
        }

        await updateItemMutation(parsed.itemId, fields)
        return { success: true, itemsUpdated: 1 }
      }

      case 'deleteItems': {
        const parsed = (todoTools.deleteItems as any).inputSchema.parse(args)
        const { existingIds, missingIds } = await splitExistingAndMissingIds(parsed.itemIds)
        if (existingIds.length > 0) {
          await deleteItemsMutation(existingIds)
        }
        return { success: true, itemsDeleted: existingIds.length, notFound: missingIds }
      }

      case 'addAndCompleteItems': {
        const parsed = (todoTools.addAndCompleteItems as any).inputSchema.parse(args)
        await addItemsMutation(
          listId,
          parsed.items.map((item: any) => ({ ...item, completed: true }))
        )
        return { success: true, itemsAdded: parsed.items.length }
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
