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
        className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden`}
        onPointerMove={e => {
          if (!draggingRef.current || !containerRef.current) return
          const rect = containerRef.current.getBoundingClientRect()
          const ratio = orientation === 'vertical'
            ? (e.clientY - rect.top) / rect.height
            : (e.clientX - rect.left) / rect.width
          const clamped = Math.min(0.85, Math.max(0.15, ratio))
          setSplitRatio(clamped)
        }}
        onPointerUp={() => {
          draggingRef.current = false
        }}
        onPointerLeave={() => {
          draggingRef.current = false
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
          className={`flex ${orientation === 'vertical' ? 'flex-col border-y' : 'flex-col border-x'} items-stretch bg-gray-50 border-gray-200`}
        >
          <div
            className={orientation === 'vertical'
              ? 'h-2 cursor-row-resize bg-gray-300'
              : 'w-2 cursor-col-resize bg-gray-300'}
            style={{ touchAction: 'none' }}
            onPointerDown={() => {
              draggingRef.current = true
            }}
          />
          <div className={`flex ${orientation === 'vertical' ? '' : 'flex-col'} text-xs text-gray-500`}>
            <button
              type="button"
              onClick={() => setListVisible(v => !v)}
              className={`flex-1 py-1 hover:bg-gray-100 ${orientation === 'horizontal' ? 'border-b border-gray-200' : ''}`}
            >
              {listVisible ? 'Hide List' : 'Show List'}
            </button>
            <button
              type="button"
              onClick={() => setChatVisible(v => !v)}
              className={`flex-1 py-1 hover:bg-gray-100 ${orientation === 'vertical' ? 'border-l border-gray-200' : ''}`}
            >
              {chatVisible ? 'Hide Chat' : 'Show Chat'}
            </button>
            <button
              type="button"
              onClick={() => {
                userOverrodeRef.current = true
                setOrientation(o => (o === 'vertical' ? 'horizontal' : 'vertical'))
              }}
              className={`flex-1 py-1 border-t border-gray-200 hover:bg-gray-100`}
            >
              {orientation === 'vertical' ? '⬍' : '⬌'}
            </button>
          </div>
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
