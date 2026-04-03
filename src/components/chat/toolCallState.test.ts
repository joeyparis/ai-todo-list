import { describe, expect, it } from 'vitest'
import { createToolCallState } from './toolCallState'

describe('createToolCallState', () => {
  it('stores and returns cached tool results by call id', () => {
    const state = createToolCallState()
    const result = { success: true, itemsCompleted: 1 }

    state.setCachedResult('call-1', result)

    expect(state.getCachedResult('call-1')).toEqual(result)
  })

  it('tracks and clears in-flight execution by call id', async () => {
    const state = createToolCallState()
    const execution = Promise.resolve({ success: true })

    state.setInFlight('call-2', execution)

    expect(state.getInFlight('call-2')).toBe(execution)

    await execution
    state.clearInFlight('call-2')

    expect(state.getInFlight('call-2')).toBeUndefined()
  })

  it('resets per-turn state', () => {
    const state = createToolCallState()

    state.setCachedResult('call-3', { success: false })
    state.setInFlight('call-3', Promise.resolve({ success: false }))

    state.resetTurn()

    expect(state.getCachedResult('call-3')).toBeUndefined()
    expect(state.getInFlight('call-3')).toBeUndefined()
  })

  it('ignores undefined call ids', () => {
    const state = createToolCallState()

    state.setCachedResult(undefined, { success: true })
    state.setInFlight(undefined, Promise.resolve({ success: true }))

    expect(state.getCachedResult(undefined)).toBeUndefined()
    expect(state.getInFlight(undefined)).toBeUndefined()
  })
})
