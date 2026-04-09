export const CORE_METADATA_VALUES = {
  priority: ['high', 'medium', 'low'] as const,
  effort: ['quick', 'medium', 'long'] as const,
} as const

export const CORE_METADATA_RULES = [
  `priority: ${CORE_METADATA_VALUES.priority.join('|')}`,
  `effort: ${CORE_METADATA_VALUES.effort.join('|')}`,
].join('; ')
