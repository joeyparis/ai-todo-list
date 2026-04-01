'use client'
import { useState } from 'react'
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

      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className={`flex flex-col overflow-hidden transition-all duration-300 ${
            listVisible ? (chatVisible ? 'flex-[45]' : 'flex-1') : 'flex-[0] min-h-0'
          }`}
        >
          <div className="flex-1 overflow-y-auto">
            {listVisible && listPanel}
          </div>
          <button
            type="button"
            onClick={() => setListVisible(v => !v)}
            className="flex-shrink-0 w-full py-1 text-xs text-gray-400 border-t border-gray-100 bg-gray-50 hover:bg-gray-100"
          >
            {listVisible ? '▲ Hide List' : '▼ Show List'}
          </button>
        </div>

        <div
          className={`flex flex-col overflow-hidden transition-all duration-300 border-t border-gray-200 ${
            chatVisible ? (listVisible ? 'flex-[55]' : 'flex-1') : 'flex-[0] min-h-0'
          }`}
        >
          <button
            type="button"
            onClick={() => setChatVisible(v => !v)}
            className="flex-shrink-0 w-full py-1 text-xs text-gray-400 border-b border-gray-100 bg-gray-50 hover:bg-gray-100"
          >
            {chatVisible ? '▼ Hide Chat' : '▲ Show Chat'}
          </button>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {chatVisible && chatPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
