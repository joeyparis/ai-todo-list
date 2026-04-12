// @vitest-environment happy-dom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoPanel } from './TodoPanel'

const mockUseItems = vi.fn()
const mockUseMediaQuery = vi.fn()
const mockCompleteItems = vi.fn()

vi.mock('@/lib/db/hooks', () => ({
  useItems: (...args: unknown[]) => mockUseItems(...args),
}))

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (...args: unknown[]) => mockUseMediaQuery(...args),
}))

vi.mock('@/lib/db/mutations', () => ({
  completeItems: (...args: unknown[]) => mockCompleteItems(...args),
  deleteItems: vi.fn(),
  reorderItems: vi.fn(),
  uncompleteItems: vi.fn(),
}))

vi.mock('./AddItemInput', () => ({
  AddItemInput: () => React.createElement('div', { 'data-testid': 'add-item-input' }),
}))

vi.mock('./TodoItem', () => ({
  TodoItem: ({ item, isCompleting, onToggleComplete }: { item: { text: string }, isCompleting?: boolean, onToggleComplete?: () => void }) => React.createElement(
    'button',
    {
      type: 'button',
      'data-testid': `todo-item-${item.text}`,
      'data-completing': isCompleting ? 'true' : 'false',
      onClick: onToggleComplete,
    },
    item.text,
  ),
}))

describe('TodoPanel completion animation', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    mockUseItems.mockReturnValue([
      {
        id: 'item-1',
        listId: 'list-1',
        text: 'First task',
        completed: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        order: 0,
      },
    ])
    mockUseMediaQuery.mockReturnValue(false)
    mockCompleteItems.mockResolvedValue(undefined)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('keeps the item in the animating state until the timeout expires', () => {
    act(() => {
      root.render(React.createElement(TodoPanel, { listId: 'list-1' }))
    })

    const button = container.querySelector('[data-testid="todo-item-First task"]') as HTMLButtonElement

    act(() => {
      button.click()
    })

    expect(mockCompleteItems).toHaveBeenCalledWith(['item-1'])
    expect(button.getAttribute('data-completing')).toBe('true')

    act(() => {
      vi.advanceTimersByTime(249)
    })

    expect(button.getAttribute('data-completing')).toBe('true')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(button.getAttribute('data-completing')).toBe('false')
  })

  it('skips the animation delay when reduced motion is enabled', () => {
    mockUseMediaQuery.mockReturnValue(true)

    act(() => {
      root.render(React.createElement(TodoPanel, { listId: 'list-1' }))
    })

    const button = container.querySelector('[data-testid="todo-item-First task"]') as HTMLButtonElement

    act(() => {
      button.click()
    })

    expect(mockCompleteItems).toHaveBeenCalledWith(['item-1'])
    expect(button.getAttribute('data-completing')).toBe('false')
  })
})
