// @vitest-environment happy-dom
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoItem } from './TodoItem'

const mockCompleteItems = vi.fn()

vi.mock('@/lib/db/mutations', () => ({
  completeItems: (...args: unknown[]) => mockCompleteItems(...args),
  deleteItems: vi.fn(),
  uncompleteItems: vi.fn(),
  updateItem: vi.fn(),
}))

describe('TodoItem completion handler', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mockCompleteItems.mockResolvedValue(undefined)
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.clearAllMocks()
  })

  it('uses the custom completion handler when provided', () => {
    const onToggleComplete = vi.fn()

    act(() => {
      root.render(React.createElement(TodoItem, {
        item: {
          id: 'item-1',
          listId: 'list-1',
          text: 'Finish review',
          completed: false,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          order: 0,
        },
        onToggleComplete,
      }))
    })

    const checkbox = container.querySelector('[data-testid="todo-checkbox"]') as HTMLButtonElement

    act(() => {
      checkbox.click()
    })

    expect(onToggleComplete).toHaveBeenCalledTimes(1)
    expect(mockCompleteItems).not.toHaveBeenCalled()
  })
})
