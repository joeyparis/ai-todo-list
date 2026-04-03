import { describe, it, expect } from 'vitest'
import { detectToolCallMismatch, buildCorrectionPrompt } from './verification'

const toolPart = (toolName: string) => ({
  type: `tool-${toolName}`,
  toolCallId: 'x',
  state: 'output-available' as const,
  input: {},
  output: {},
})

describe('detectToolCallMismatch', () => {
  describe('positive - text only, no tool parts', () => {
    it("detects \"I've marked X as done\" (pattern: i've + marked)", () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: "I've marked the groceries as done" },
      ])
      expect(result.mismatch).toBe(true)
    })

    it('detects "Added N items" (pattern: added + item)', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Added 3 items to your list!' },
      ])
      expect(result.mismatch).toBe(true)
    })

    it('detects "I deleted that task" (pattern: deleted + task)', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'I deleted that task for you' },
      ])
      expect(result.mismatch).toBe(true)
    })

    it('detects "I updated the item" (pattern: updated + item)', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'I updated the item text' },
      ])
      expect(result.mismatch).toBe(true)
    })

    it('detects "Unchecked that item" (pattern: unchecked)', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Unchecked that item for you' },
      ])
      expect(result.mismatch).toBe(true)
    })

    it("detects \"I've completed the [task name]\" (pattern: i've + completed)", () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: "I've completed the set up new litter box task" },
      ])
      expect(result.mismatch).toBe(true)
    })

    it('returns a claimedAction string when mismatch is true', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: "I've marked the groceries as done" },
      ])
      expect(result.mismatch).toBe(true)
      expect(typeof result.claimedAction).toBe('string')
      expect(result.claimedAction!.length).toBeGreaterThan(0)
    })
  })

  describe('negative - few-shot texts WITH tool parts (tool called = no mismatch)', () => {
    it('example 1: "Added 3 items!" with tool-addItems', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Added 3 items!' },
        toolPart('addItems'),
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 2: "Nice - marked that done." with tool-completeItems', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Nice - marked that done.' },
        toolPart('completeItems'),
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 3: "Done - checked that off." with tool-completeItems', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Done - checked that off.' },
        toolPart('completeItems'),
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 4: "Perfect, added and checked off." with tool-addAndCompleteItems', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Perfect, added and checked off.' },
        toolPart('addAndCompleteItems'),
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 7: "Great - groceries are checked off." with tool-completeItems', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Great - groceries are checked off.' },
        toolPart('completeItems'),
      ])
      expect(result.mismatch).toBe(false)
    })
  })

  describe('negative - few-shot texts WITHOUT tool (no action claim in text)', () => {
    it('example 5: planning response does not trigger', () => {
      const result = detectToolCallMismatch([
        {
          type: 'text',
          text: "Start with must-do quick items first, then batch errands by location.",
        },
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 6: clarifying question does not trigger', () => {
      const result = detectToolCallMismatch([
        {
          type: 'text',
          text: "Which task did you finish? I want to make sure I mark the right one.",
        },
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 8: ambiguity clarification does not trigger', () => {
      const result = detectToolCallMismatch([
        {
          type: 'text',
          text: "Did you do the laundry at home or pick up from the cleaners? I want to mark the right one.",
        },
      ])
      expect(result.mismatch).toBe(false)
    })

    it('example 9: already-completed acknowledgement does not trigger', () => {
      const result = detectToolCallMismatch([
        {
          type: 'text',
          text: "That's already checked off - you got it done earlier.",
        },
      ])
      expect(result.mismatch).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('empty parts array', () => {
      expect(detectToolCallMismatch([]).mismatch).toBe(false)
    })

    it('tool part only, no text', () => {
      expect(detectToolCallMismatch([toolPart('completeItems')]).mismatch).toBe(false)
    })

    it('future tense offer does not trigger', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: "I'll mark that as done for you" },
      ])
      expect(result.mismatch).toBe(false)
    })

    it('single ambiguous word does not trigger', () => {
      const result = detectToolCallMismatch([{ type: 'text', text: 'Done!' }])
      expect(result.mismatch).toBe(false)
    })

    it('present-tense offer does not trigger', () => {
      const result = detectToolCallMismatch([
        { type: 'text', text: 'Let me mark that as done' },
      ])
      expect(result.mismatch).toBe(false)
    })

    it('claimedAction is undefined when mismatch is false', () => {
      const result = detectToolCallMismatch([{ type: 'text', text: 'Done!' }])
      expect(result.mismatch).toBe(false)
      expect(result.claimedAction).toBeUndefined()
    })
  })
})

describe('buildCorrectionPrompt', () => {
  it('includes the claimed action in the output', () => {
    const prompt = buildCorrectionPrompt('marked item done')
    expect(prompt).toContain('marked item done')
  })

  it('instructs the LLM to call a tool', () => {
    const prompt = buildCorrectionPrompt('marked item done')
    expect(prompt).toContain('tool')
  })

  it('mentions that the list is unchanged', () => {
    const prompt = buildCorrectionPrompt('added item')
    expect(prompt).toContain('unchanged')
  })

  it('returns a non-empty string for any action label', () => {
    expect(buildCorrectionPrompt('deleted item').length).toBeGreaterThan(0)
    expect(buildCorrectionPrompt('performed action').length).toBeGreaterThan(0)
  })
})
