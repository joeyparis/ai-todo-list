export interface ToolCallState {
  resetTurn: () => void
  getCachedResult: (callId: string | undefined) => unknown | undefined
  setCachedResult: (callId: string | undefined, result: unknown) => void
  getInFlight: (callId: string | undefined) => Promise<unknown> | undefined
  setInFlight: (callId: string | undefined, promise: Promise<unknown>) => void
  clearInFlight: (callId: string | undefined) => void
}

export function createToolCallState(): ToolCallState {
  const cachedResults = new Map<string, unknown>()
  const inFlight = new Map<string, Promise<unknown>>()

  return {
    resetTurn: () => {
      cachedResults.clear()
      inFlight.clear()
    },
    getCachedResult: (callId: string | undefined) => {
      if (!callId) {
        return undefined
      }

      return cachedResults.get(callId)
    },
    setCachedResult: (callId: string | undefined, result: unknown) => {
      if (!callId) {
        return
      }

      cachedResults.set(callId, result)
    },
    getInFlight: (callId: string | undefined) => {
      if (!callId) {
        return undefined
      }

      return inFlight.get(callId)
    },
    setInFlight: (callId: string | undefined, promise: Promise<unknown>) => {
      if (!callId) {
        return
      }

      inFlight.set(callId, promise)
    },
    clearInFlight: (callId: string | undefined) => {
      if (!callId) {
        return
      }

      inFlight.delete(callId)
    },
  }
}
