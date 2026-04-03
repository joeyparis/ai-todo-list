import { tool } from 'ai'
import { z } from 'zod'

const itemInputSchema = z.array(z.object({
  text: z.string().min(1).describe('The text content of the todo item'),
  metadata: z.record(z.unknown()).optional().describe('Optional inferred metadata (priority, location, effort, skipability, etc.)'),
}))

export const todoTools = {
  addItems: tool({
    description: 'Add one or more new todo items to the current list. Use this when the user describes tasks, activities, or things they need to do. Infer metadata (priority, location, effort, skipability) from context when possible.',
    inputSchema: z.object({
      items: itemInputSchema.describe('Array of items to add'),
    }),
  }),

  completeItems: tool({
    description: 'Mark existing todo items as completed. Use this when the user indicates completion in statements or commands, including done, finished, completed, crossed off, check off, or mark as done/complete. Match by item ID.',
    inputSchema: z.object({
      itemIds: z.array(z.string()).min(1).describe('Array of item IDs to mark as completed'),
    }),
  }),

  uncompleteItems: tool({
    description: 'Revert completed todo items back to incomplete status. Use this when the user wants to un-check or reopen a previously completed item.',
    inputSchema: z.object({
      itemIds: z.array(z.string()).min(1).describe('Array of item IDs to mark as incomplete'),
    }),
  }),

  updateItem: tool({
    description: 'Update the text or metadata of an existing todo item. Use this when the user wants to edit, rename, or update details/context. Never use this to mark completion status or represent done/complete by changing title text - use completeItems instead.',
    inputSchema: z.object({
      itemId: z.string().describe('The ID of the item to update'),
      text: z.string().min(1).optional().describe('New text for the item'),
      metadata: z.record(z.unknown()).optional().describe('Updated metadata for the item'),
    }),
  }),

  deleteItems: tool({
    description: 'Permanently remove one or more items from the list. Use this when the user explicitly asks to delete, remove, or cancel items (not complete them).',
    inputSchema: z.object({
      itemIds: z.array(z.string()).min(1).describe('Array of item IDs to delete'),
    }),
  }),

  addAndCompleteItems: tool({
    description: 'Add items to the list AND immediately mark them as completed. Use this ONLY when the user mentions tasks they have ALREADY done that are not currently on the list (e.g., "I already walked the dog", "Oh I also picked up the dry cleaning").',
    inputSchema: z.object({
      items: itemInputSchema.describe('Array of already-completed items to add and mark done'),
    }),
  }),
}

export type TodoTools = typeof todoTools
