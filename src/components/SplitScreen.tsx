'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { springDefault, tweenFast } from '@/lib/motion'

interface SplitScreenProps {
  listName: string
  listPanel: React.ReactNode
  chatPanel: React.ReactNode
  onBack: () => void
  onClearChat?: () => void
  startOnChat?: boolean
}

export function SplitScreen({ listName, listPanel, chatPanel, onBack, onClearChat, startOnChat = false }: SplitScreenProps) {
  const [listVisible, setListVisible] = useState(true)
  const [chatVisible, setChatVisible] = useState(true)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('horizontal')
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>(startOnChat ? 'chat' : 'tasks')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const userOverrodeRef = useRef(false)

  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    if (userOverrodeRef.current) return
    if (isDesktop) {
      setOrientation('horizontal')
      setSplitRatio(0.45)
      setListVisible(true)
      setChatVisible(true)
    } else if (isTablet) {
      setOrientation('horizontal')
      setSplitRatio(0.5)
      setListVisible(true)
      setChatVisible(true)
    }
  }, [isDesktop, isTablet])

  return (
    <div className="flex flex-col h-[100dvh] bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50">
      <header className="flex items-center justify-between px-4 h-14 border-b border-surface-200 dark:border-surface-800 flex-shrink-0 bg-white dark:bg-surface-900">
        <button type="button" onClick={onBack} className="text-primary-500 dark:text-primary-400 text-sm font-medium min-w-[44px] min-h-[44px] flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Back
        </button>
        <h1 className="text-base font-semibold truncate mx-2">{listName}</h1>
        <div className="flex items-center gap-1">
          {onClearChat ? (
            <button
              type="button"
              onClick={onClearChat}
              aria-label="Clear chat history"
              title="Clear chat history"
              className="text-surface-400 dark:text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Clear chat"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          ) : null}
          <Link href="/settings" aria-label="Settings" className="text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 min-w-[44px] min-h-[44px] flex items-center justify-end">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </Link>
        </div>
      </header>

      {isMobile && (
        <div className="flex border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0 relative">
          <button
            type="button"
            data-testid="tab-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 text-sm font-medium text-center relative transition-colors ${activeTab === 'tasks' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500 dark:text-surface-400'}`}
          >
            Tasks
          </button>
          <button
            type="button"
            data-testid="tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-sm font-medium text-center relative transition-colors ${activeTab === 'chat' ? 'text-primary-600 dark:text-primary-400' : 'text-surface-500 dark:text-surface-400'}`}
          >
            Chat
          </button>
          <motion.div
            className="absolute bottom-0 h-0.5 bg-primary-600 dark:bg-primary-400"
            style={{ width: '50%' }}
            animate={{ x: activeTab === 'tasks' ? '0%' : '100%' }}
            transition={springDefault}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={`flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} flex-1 overflow-hidden ${isDragging ? 'select-none' : ''}`}
        onPointerMove={e => {
          if (!draggingRef.current || !containerRef.current || isMobile) return
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
        <AnimatePresence mode="wait">
        {(!isMobile || activeTab === 'tasks') && (
          <motion.div
            key="tasks-panel"
            className={`flex flex-col overflow-hidden ${isMobile ? 'w-full' : ''}`}
            style={!isMobile ? { flex: listVisible ? splitRatio : 0 } : undefined}
            initial={isMobile ? { opacity: 0, x: -20 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={isMobile ? { opacity: 0, x: -20 } : undefined}
            transition={isMobile ? springDefault : tweenFast}
          >
            <div className="flex-1 overflow-y-auto">
              {(!isMobile ? listVisible : true) && listPanel}
            </div>
          </motion.div>
        )}

        {!isMobile && (
          <div
            data-testid="split-divider"
            className={`flex ${orientation === 'vertical' ? 'flex-row h-8 border-y' : 'flex-col w-8 border-x'} items-center bg-surface-100 dark:bg-surface-900 border-surface-200 dark:border-surface-800`}
          >
            <button
              type="button"
              title={listVisible ? 'Hide list' : 'Show list'}
              onClick={() => setListVisible(v => !v)}
              className={`p-1.5 flex items-center justify-center text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-800 rounded ${!listVisible ? 'opacity-40' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>

            <div
              className={`flex-1 ${orientation === 'vertical' ? 'h-1 mx-1' : 'w-1 my-1'} bg-surface-300 dark:bg-surface-700 rounded-full flex items-center justify-center ${orientation === 'vertical' ? 'cursor-row-resize' : 'cursor-col-resize'} hover:bg-primary-400 dark:hover:bg-primary-500 transition-colors`}
              style={{ touchAction: 'none' }}
              onPointerDown={() => {
                draggingRef.current = true
                setIsDragging(true)
              }}
            >
              <div className={`flex ${orientation === 'vertical' ? 'flex-row gap-1' : 'flex-col gap-1'}`}>
                <div className="w-1 h-1 rounded-full bg-surface-400 dark:bg-surface-600" />
                <div className="w-1 h-1 rounded-full bg-surface-400 dark:bg-surface-600" />
                <div className="w-1 h-1 rounded-full bg-surface-400 dark:bg-surface-600" />
              </div>
            </div>

            <button
              type="button"
              title={chatVisible ? 'Hide chat' : 'Show chat'}
              onClick={() => setChatVisible(v => !v)}
              className={`p-1.5 flex items-center justify-center text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-800 rounded ${!chatVisible ? 'opacity-40' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>

            <button
              type="button"
              title="Toggle orientation"
              onClick={() => {
                userOverrodeRef.current = true
                setOrientation(o => (o === 'vertical' ? 'horizontal' : 'vertical'))
              }}
              className="p-1.5 flex items-center justify-center text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-200 dark:hover:bg-surface-800 rounded"
            >
              {orientation === 'vertical' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              )}
            </button>
          </div>
        )}

        {(!isMobile || activeTab === 'chat') && (
          <motion.div
            key="chat-panel"
            className={`flex flex-col overflow-hidden ${isMobile ? 'w-full' : ''}`}
            style={!isMobile ? { flex: chatVisible ? 1 - splitRatio : 0 } : undefined}
            initial={isMobile ? { opacity: 0, x: 20 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={isMobile ? { opacity: 0, x: 20 } : undefined}
            transition={isMobile ? springDefault : tweenFast}
          >
            <div className="flex-1 overflow-y-auto flex flex-col">
              {(!isMobile ? chatVisible : true) && chatPanel}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  )
}
