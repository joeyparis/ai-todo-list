import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, serializeListState } from './prompts'

describe('serializeListState', () => {
  it('serializes items with metadata', () => {
    const result = serializeListState(
      { name: 'Errands', goal: 'By Sunday' } as any,
      [
        { id: 'a1', text: 'Buy milk', completed: false, metadata: { priority: 'high', location: 'Store' } },
        { id: 'b2', text: 'Walk dog', completed: true, metadata: {} },
      ] as any,
    )
    expect(result).toContain('Errands')
    expect(result).toContain('By Sunday')
    expect(result).toContain('Buy milk')
    expect(result).toContain('a1')
    expect(result).toContain('[done]')
    expect(result).toContain('priority')
  })

  it('handles empty list', () => {
    const result = serializeListState({ name: 'Empty' } as any, [])
    expect(result).toContain('Empty')
    expect(result).toContain('0 active')
  })
})

describe('buildSystemPrompt', () => {
  it('includes list context and instructions', () => {
    const prompt = buildSystemPrompt(
      { name: 'Weekend' } as any,
      [{ id: 'x1', text: 'Task', completed: false, metadata: {} }] as any,
    )
    expect(prompt).toContain('Weekend')
    expect(prompt).toContain('Task')
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt.length).toBeLessThan(8000)
  })

  it('produces valid prompt for empty list', () => {
    const prompt = buildSystemPrompt({ name: 'New List' } as any, [])
    expect(prompt).toContain('New List')
    expect(prompt.length).toBeGreaterThan(50)
  })
})
