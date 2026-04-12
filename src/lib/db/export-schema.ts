import { z } from 'zod'

/**
 * Export envelope for import/export feature.
 * Wraps the actual data with metadata (version, timestamp).
 * Dates are serialized as ISO 8601 strings.
 */
export interface ExportEnvelope {
  version: 1
  exportedAt: string // ISO 8601
  data: {
    lists: Array<{
      id: string
      name: string
      goal?: string
      createdAt: string // ISO 8601
      updatedAt: string // ISO 8601
    }>
    items: Array<{
      id: string
      listId: string
      text: string
      completed: boolean
      completedAt?: string // ISO 8601
      metadata: Record<string, unknown>
      createdAt: string // ISO 8601
      updatedAt: string // ISO 8601
      order: number
    }>
    settings?: {
      activeProvider: string
      providerConfigs: Record<string, { apiKey: string; model: string }>
      inferMetadata?: boolean
      theme?: 'light' | 'dark'
    }
  }
}

/**
 * Zod schema for validating import data.
 * Ensures type safety and structure validation before processing.
 */
export const exportEnvelopeSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  data: z.object({
    lists: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        goal: z.string().optional(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
      })
    ),
    items: z.array(
      z.object({
        id: z.string(),
        listId: z.string(),
        text: z.string(),
        completed: z.boolean(),
        completedAt: z.string().datetime().optional(),
        metadata: z.record(z.unknown()),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        order: z.number(),
      })
    ),
    settings: z
      .object({
        activeProvider: z.string(),
        providerConfigs: z.record(
          z.object({
            apiKey: z.string(),
            model: z.string(),
          })
        ),
        inferMetadata: z.boolean().optional(),
        theme: z.enum(['light', 'dark']).optional(),
      })
      .optional(),
  }),
})

/**
 * Validates import data against the export schema.
 * Performs two-stage validation:
 * 1. Zod schema validation (structure and types)
 * 2. Referential integrity check (all items reference valid lists)
 *
 * @param data - Unknown data to validate
 * @returns Validated ExportEnvelope
 * @throws ZodError if structure/types are invalid
 * @throws Error if referential integrity is violated
 */
export function validateImportData(data: unknown): ExportEnvelope {
  // Stage 1: Zod validation
  const parsed = exportEnvelopeSchema.parse(data)

  // Stage 2: Referential integrity check
  const validListIds = new Set(parsed.data.lists.map((list) => list.id))

  for (const item of parsed.data.items) {
    if (!validListIds.has(item.listId)) {
      throw new Error(
        `Invalid import: item references unknown list ID: ${item.listId}`
      )
    }
  }

  return parsed
}
