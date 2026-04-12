import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, serializeListState } from './prompts'

describe('serializeListState', () => {
  it('serializes items with metadata', () => {
    const result = serializeListState(
      { name: 'Errands', goal: 'By Sunday' } as any,
      [
        { id: 'a1', text: 'Buy milk', completed: false, category: 'Produce', metadata: { priority: 'high' } },
        { id: 'b2', text: 'Walk dog', completed: true, metadata: {} },
      ] as any,
    )
    expect(result).toContain('Errands')
    expect(result).toContain('By Sunday')
    expect(result).toContain('Buy milk')
    expect(result).toContain('a1')
    expect(result).toContain('[done]')
    expect(result).toContain('category: Produce')
    expect(result).toContain('priority')
  })

  it('handles empty list', () => {
    const result = serializeListState({ name: 'Empty' } as any, [])
    expect(result).toContain('Empty')
    expect(result).toContain('0 active')
  })
})

describe('buildSystemPrompt', () => {
  const list = { name: 'Weekend' } as any
  const items = [{ id: 'x1', text: 'Task', completed: false, metadata: {} }] as any

  it('includes list context', () => {
    const prompt = buildSystemPrompt(list, items)
    expect(prompt).toContain('Weekend')
    expect(prompt).toContain('Task')
  })

  it('establishes tool-calling role in first 300 characters', () => {
    const prompt = buildSystemPrompt(list, items)
    const opening = prompt.substring(0, 300)
    expect(opening.toLowerCase()).toMatch(/tool call/)
  })

  it('static portion is under 2500 characters', () => {
    const prompt = buildSystemPrompt({ name: 'Test' } as any, [])
    expect(prompt.length).toBeLessThan(2500)
  })

  it('contains no numbered few-shot example patterns', () => {
    const prompt = buildSystemPrompt(list, items)
    expect(prompt).not.toMatch(/^\d+\)/m)
    expect(prompt).not.toContain('Few-shot examples')
    expect(prompt).not.toContain('Behavior:')
  })

  it('contains metadata guidance', () => {
    const prompt = buildSystemPrompt(list, items)
    expect(prompt.toLowerCase()).toContain('metadata')
  })

  it('contains category guidance', () => {
    const prompt = buildSystemPrompt(list, items)
    expect(prompt.toLowerCase()).toContain('category field')
    expect(prompt.toLowerCase()).toContain('updateitems')
  })

  it('contains source-of-truth rule', () => {
    const prompt = buildSystemPrompt(list, items)
    const lower = prompt.toLowerCase()
    expect(lower).toMatch(/authoritative|source of truth|list context.*authoritative/i)
  })

  it('ends with a reinforcement of tool-calling', () => {
    const prompt = buildSystemPrompt(list, items)
    const closing = prompt.substring(prompt.length - 300)
    expect(closing.toLowerCase()).toMatch(/tool call/)
  })

  it('is under 80 lines for static portion', () => {
    const prompt = buildSystemPrompt({ name: 'Test' } as any, [])
    expect(prompt.split('\n').length).toBeLessThan(80)
  })
})
