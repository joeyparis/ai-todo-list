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
    expect(prompt).toContain('Addition safety rules')
    expect(prompt).toContain('State source-of-truth rules')
    expect(prompt).toContain('current list context is authoritative')
    expect(prompt).toContain('do not call completion tools')
    expect(prompt).toContain('mark as done')
    expect(prompt).toContain('Never use updateItem to represent completion')
    expect(prompt).toContain('Completion command -> completeItems')
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt.length).toBeLessThan(10000)
  })

  it('includes all 9 few-shot examples', () => {
    const prompt = buildSystemPrompt(
      { name: 'Test' } as any,
      [{ id: 'x1', text: 'Task', completed: false, metadata: {} }] as any,
    )
    expect(prompt).toContain('1) Brain dump -> addItems')
    expect(prompt).toContain('2) Fuzzy completion -> completeItems')
    expect(prompt).toContain('3) Completion command -> completeItems')
    expect(prompt).toContain('4) Already done but not on list -> addAndCompleteItems')
    expect(prompt).toContain('5) Planning question -> smart response, no tool')
    expect(prompt).toContain('6) Pronoun completion -> ask clarifying question')
    expect(prompt).toContain('7) Completion with "also" modifier -> completeItems')
    expect(prompt).toContain('8) Ambiguous match clarification -> ask before tool call')
    expect(prompt).toContain('9) Already-completed item -> acknowledge, no tool call')
  })

  it('strengthens "also" disambiguation in Addition safety rules', () => {
    const prompt = buildSystemPrompt(
      { name: 'Test' } as any,
      [{ id: 'x1', text: 'Task', completed: false, metadata: {} }] as any,
    )
    expect(prompt).toContain('The word "also" alone does not determine intent')
    expect(prompt).toContain('I also finished X" is completion')
    expect(prompt).toContain('I also need to add X" is addition')
  })

  it('maintains prompt size under limits', () => {
    const prompt = buildSystemPrompt(
      { name: 'Weekend' } as any,
      [{ id: 'x1', text: 'Task', completed: false, metadata: {} }] as any,
    )
    expect(prompt.split('\n').length).toBeLessThan(300)
    expect(prompt.length).toBeLessThan(10000)
  })

  it('produces valid prompt for empty list', () => {
    const prompt = buildSystemPrompt({ name: 'New List' } as any, [])
    expect(prompt).toContain('New List')
    expect(prompt.length).toBeGreaterThan(50)
  })
})
