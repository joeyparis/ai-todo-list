type AnyPart = { type: string; text?: string; [key: string]: unknown }

// [^.!?\-]{0,40} prevents cross-clause matching via dashes:
// "checked off - you got it done" must NOT match (dash breaks the clause boundary).
// Plain .{0,40} would allow 16-char paths like "off - you got it" + " " + "done".
const ACTION_CLAIM_PATTERNS: Array<{ pattern: RegExp; action: string }> = [
  {
    pattern: /\b(marked|checked|crossed)\s+[^.!?\-]{0,40}\s+(done|off|complete)/i,
    action: 'marked item done',
  },
  {
    pattern: /\b(added|created)\s+.{0,30}\s+(item|task|thing)/i,
    action: 'added item',
  },
  {
    pattern: /\b(deleted|removed)\s+.{0,30}\s+(item|task|that)/i,
    action: 'deleted item',
  },
  {
    pattern: /\b(updated|changed|renamed)\s+.{0,30}\s+(item|task|it|that)/i,
    action: 'updated item',
  },
  {
    pattern: /\b(unchecked|unmarked|uncompleted)\s+/i,
    action: 'uncompleted item',
  },
  {
    pattern: /i('ve| have)\s+(marked|checked|completed|added|deleted|removed|updated|crossed)/i,
    action: 'performed action',
  },
]

export function detectToolCallMismatch(parts: unknown[]): {
  mismatch: boolean
  claimedAction?: string
} {
  const anyParts = parts as AnyPart[]

  const toolParts = anyParts.filter(
    (p) => typeof p.type === 'string' && p.type.startsWith('tool-'),
  )
  if (toolParts.length > 0) {
    return { mismatch: false }
  }

  const textParts = anyParts.filter((p) => p.type === 'text')
  if (textParts.length === 0) {
    return { mismatch: false }
  }

  const fullText = textParts.map((p) => p.text ?? '').join(' ')

  for (const { pattern, action } of ACTION_CLAIM_PATTERNS) {
    if (pattern.test(fullText)) {
      return { mismatch: true, claimedAction: action }
    }
  }

  return { mismatch: false }
}

export function buildCorrectionPrompt(claimedAction: string): string {
  return (
    `You just said you ${claimedAction}, but no tool was actually called and the list is unchanged. ` +
    `Please call the appropriate tool now to perform the action. Do not explain - just call the tool.`
  )
}
