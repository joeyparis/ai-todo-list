export const CORE_METADATA_VALUES = {
  priority: ['high', 'medium', 'low'] as const,
  effort: ['quick', 'medium', 'long'] as const,
  category: ['work', 'personal', 'home', 'errand', 'health', 'finance', 'learning', 'admin', 'other'] as const,
  location: ['home', 'office', 'store', 'online', 'phone', 'computer', 'outside', 'anywhere'] as const,
  skipability: ['must-do', 'nice-to-have', 'optional'] as const,
} as const

export const CORE_METADATA_RULES = [
  `priority: ${CORE_METADATA_VALUES.priority.join('|')}`,
  `effort: ${CORE_METADATA_VALUES.effort.join('|')}`,
  `category: ${CORE_METADATA_VALUES.category.join('|')}`,
  `location: ${CORE_METADATA_VALUES.location.join('|')}`,
  `skipability: ${CORE_METADATA_VALUES.skipability.join('|')}`,
].join('; ')
