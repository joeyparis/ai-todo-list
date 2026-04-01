// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let changeHandler: ((e: Partial<MediaQueryListEvent>) => void) | null = null
  let mockMatchMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    changeHandler = null

    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn((_event: string, handler: any) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    })

    act(() => {
      root = createRoot(container)
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('returns false initially when matchMedia.matches is false', () => {
    let hookResult = false

    function TestComponent() {
      hookResult = useMediaQuery('(min-width: 768px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    expect(hookResult).toBe(false)
  })

  it('calls window.matchMedia with the provided query', () => {
    function TestComponent() {
      useMediaQuery('(min-width: 1024px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    expect(mockMatchMedia).toHaveBeenCalledWith('(min-width: 1024px)')
  })

  it('registers a change event listener on mount', () => {
    const mql = {
      matches: false,
      media: '(max-width: 600px)',
      addEventListener: vi.fn((_event: string, handler: any) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mql)

    function TestComponent() {
      useMediaQuery('(max-width: 600px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates value when media query changes', () => {
    let hookResult = false
    const mql = {
      matches: false,
      media: '(min-width: 768px)',
      addEventListener: vi.fn((_event: string, handler: any) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    mockMatchMedia.mockReturnValue(mql)

    function TestComponent() {
      hookResult = useMediaQuery('(min-width: 768px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    expect(hookResult).toBe(false)

    // Simulate media query change
    act(() => {
      changeHandler!({ matches: true } as Partial<MediaQueryListEvent>)
    })

    expect(hookResult).toBe(true)
  })

  it('removes event listener on unmount', () => {
    const removeListener = vi.fn()
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(min-width: 768px)',
      addEventListener: vi.fn((_e: string, h: any) => {
        changeHandler = h
      }),
      removeEventListener: removeListener,
      dispatchEvent: vi.fn(),
    })

    function TestComponent() {
      useMediaQuery('(min-width: 768px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    act(() => {
      root.unmount()
    })

    expect(removeListener).toHaveBeenCalled()
  })

  it('returns true when matchMedia.matches is true initially', () => {
    let hookResult = false
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: '(min-width: 768px)',
      addEventListener: vi.fn((_event: string, handler: any) => {
        changeHandler = handler
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    function TestComponent() {
      hookResult = useMediaQuery('(min-width: 768px)')
      return null
    }

    act(() => {
      root.render(React.createElement(TestComponent))
    })

    expect(hookResult).toBe(true)
  })
})
