'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface SplitScreenProps {
  listName: string
  listPanel: React.ReactNode
  chatPanel: React.ReactNode
  onBack: () => void
}

export function SplitScreen({ listName, listPanel, chatPanel, onBack }: SplitScreenProps) {
  const [listVisible, setListVisible] = useState(true)
  const [chatVisible, setChatVisible] = useState(true)
  const [splitRatio, setSplitRatio] = useState(0.45)
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const userOverrodeRef = useRef(false)

  function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)
    useEffect(() => {
      const mql = window.matchMedia(query)
      setMatches(mql.matches)
      const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }, [query])
    return matches
  }

  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    if (userOverrodeRef.current) return
    setOrientation(isDesktop ? 'horizontal' : 'vertical')
  }, [isDesktop])

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 h-12 border-b border-gray-200 flex-shrink-0">
        <button type="button" onClick={onBack} className="text-blue-500 text-sm font-medium min-w-[44px] min-h-[44px] flex items-center">
          ← Back
        </button>
        <h1 className="text-base font-semibold truncate mx-2">{listName}</h1>
        <Link href="/settings" className="text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-end">
          ⚙️
        </Link>
      </header>

      <div
        ref={containerRef}
        className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden ${isDragging ? 'select-none' : ''}`}
        onPointerMove={e => {
          if (!draggingRef.current || !containerRef.current) return
          e.preventDefault()
          const rect = containerRef.current.getBoundingClientRect()
          const ratio = orientation === 'vertical'
            ? (e.clientY - rect.top) / rect.height
            : (e.clientX - rect.left) / rect.width
          const clamped = Math.min(0.85, Math.max(0.15, ratio))
          setSplitRatio(clamped)
        }}
        onPointerUp={() => {
          draggingRef.current = false
          setIsDragging(false)
        }}
        onPointerLeave={() => {
          draggingRef.current = false
          setIsDragging(false)
        }}
      >
        <div
          className="flex flex-col overflow-hidden"
          style={{ flex: listVisible ? splitRatio : 0 }}
        >
          <div className="flex-1 overflow-y-auto">
            {listVisible && listPanel}
          </div>
        </div>

        <div
          className={`flex ${orientation === 'vertical' ? 'flex-row h-10 border-y' : 'flex-col w-10 border-x'} items-center bg-gray-50 border-gray-200`}
        >
          <button
            type="button"
            title={listVisible ? 'Hide list' : 'Show list'}
            onClick={() => setListVisible(v => !v)}
            className={`p-1.5 flex items-center justify-center hover:bg-gray-100 ${!listVisible ? 'opacity-40' : ''}`}
          >
            ☰
          </button>

          <div
            className={`flex-1 ${orientation === 'vertical' ? 'h-3 mx-1' : 'w-3 my-1'} bg-gray-300 rounded flex items-center justify-center ${orientation === 'vertical' ? 'cursor-row-resize' : 'cursor-col-resize'}`}
            style={{ touchAction: 'none' }}
            onPointerDown={() => {
              draggingRef.current = true
              setIsDragging(true)
            }}
          >
            <span className="text-gray-600 text-xs select-none">
              {orientation === 'vertical' ? '⋯' : '⋮'}
            </span>
          </div>

          <button
            type="button"
            title={chatVisible ? 'Hide chat' : 'Show chat'}
            onClick={() => setChatVisible(v => !v)}
            className={`p-1.5 flex items-center justify-center hover:bg-gray-100 ${!chatVisible ? 'opacity-40' : ''}`}
          >
            💬
          </button>

          <button
            type="button"
            title="Toggle orientation"
            onClick={() => {
              userOverrodeRef.current = true
              setOrientation(o => (o === 'vertical' ? 'horizontal' : 'vertical'))
            }}
            className="p-1.5 flex items-center justify-center hover:bg-gray-100"
          >
            {orientation === 'vertical' ? '⬍' : '⬌'}
          </button>
        </div>

        <div
          className="flex flex-col overflow-hidden"
          style={{ flex: chatVisible ? 1 - splitRatio : 0 }}
        >
          <div className="flex-1 overflow-y-auto flex flex-col">
            {chatVisible && chatPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
