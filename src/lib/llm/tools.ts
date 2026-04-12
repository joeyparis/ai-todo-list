import { tool } from 'ai'
import { z } from 'zod'
import { CORE_METADATA_RULES, CORE_METADATA_VALUES } from './metadata'

const coreMetadataSchema = z.object({
  priority: z.enum(CORE_METADATA_VALUES.priority).optional(),
  effort: z.enum(CORE_METADATA_VALUES.effort).optional(),
}).strip()

const itemInputSchema = z.array(z.object({
  text: z.string().min(1).describe('The text content of the todo item'),
  category: z.string().max(100).optional().describe('Optional category label for the item'),
  metadata: coreMetadataSchema.optional().describe(`Optional inferred metadata using only these keys and values: ${CORE_METADATA_RULES}`),
}))

const reorderItemIdsSchema = z.array(z.string())
  .min(1)
  .refine(itemIds => new Set(itemIds).size === itemIds.length, {
    message: 'itemIds must not contain duplicates',
  })

export const todoTools = {
  addItems: tool({
    description: `Add one or more new todo items to the current list. Use this when the user describes tasks, activities, or things they need to do. Infer metadata from context when possible using only this core schema: ${CORE_METADATA_RULES}.`,
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
      category: z.string().max(100).optional().describe('Updated category for the item'),
      metadata: coreMetadataSchema.optional().describe(`Updated metadata for the item. Allowed keys/values: ${CORE_METADATA_RULES}`),
    }),
  }),

  updateItems: tool({
    description: `Update metadata for multiple items at once. Use this when the user asks to review the list or change metadata like priority or effort across multiple items. Use only this core metadata schema: ${CORE_METADATA_RULES}.`,
    inputSchema: z.object({
      updates: z.array(z.object({
        itemId: z.string().describe('The ID of the item to update'),
        metadata: coreMetadataSchema.describe(`Updated metadata for the item. Allowed keys/values: ${CORE_METADATA_RULES}`),
      })).min(1).describe('Array of items to update with new metadata'),
    }),
  }),

  deleteItems: tool({
    description: 'Permanently remove one or more items from the list. Use this when the user explicitly asks to delete, remove, or cancel items (not complete them).',
    inputSchema: z.object({
      itemIds: z.array(z.string()).min(1).describe('Array of item IDs to delete'),
    }),
  }),

  reorderItems: tool({
    description: 'Reorder items in the list. Use when the user asks to sort, reorder, or rearrange the visible order of items. Accepts an array of item IDs in the desired order.',
    inputSchema: z.object({
      itemIds: reorderItemIdsSchema.describe('Array of unique item IDs in the desired order'),
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
