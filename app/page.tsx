'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLists } from '@/lib/db/hooks'
import { createList, updateList, deleteList } from '@/lib/db/mutations'

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function HomePage() {
  const lists = useLists()
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [formName, setFormName] = useState('')
  const [formGoal, setFormGoal] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLists = useMemo(() => {
    if (!lists) return []
    if (!searchQuery.trim()) return lists
    const lowerQuery = searchQuery.toLowerCase()
    return lists.filter(list => list.name.toLowerCase().includes(lowerQuery))
  }, [lists, searchQuery])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    const list = await createList(formName.trim(), formGoal.trim() || undefined)
    setShowCreate(false)
    setFormName('')
    setFormGoal('')
    router.push(`/list/${list.id}`)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this list?')) return
    await deleteList(id)
  }

  async function handleRename(id: string, currentName: string) {
    const name = window.prompt('New name:', currentName)
    if (!name?.trim()) return
    await updateList(id, { name: name.trim() })
  }

  if (lists === undefined) {
    return (
      <main className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="flex items-center justify-between mb-8">
          <div className="skeleton h-8 w-48 rounded-lg"></div>
          <div className="skeleton h-10 w-10 rounded-full"></div>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-24 w-full rounded-xl"></div>
          <div className="skeleton h-24 w-full rounded-xl"></div>
          <div className="skeleton h-24 w-full rounded-xl"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 md:p-6 max-w-2xl mx-auto min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-200">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Todo List</h1>
        <Link 
          href="/settings" 
          className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors touch-target flex items-center justify-center" 
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-600 dark:text-surface-400">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </Link>
      </div>

      {lists.length >= 3 && (
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-surface-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search lists..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-base pl-10 w-full"
            data-testid="search-input"
            aria-label="Search lists"
          />
        </div>
      )}

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-4 mb-6 text-surface-500 dark:text-surface-400 hover:border-primary-400 hover:text-primary-500 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors text-left flex items-center gap-2 touch-target"
          data-testid="new-list-button"
        >
          + New List
        </button>
      ) : (
        <form onSubmit={handleCreate} className="card p-5 mb-6 animate-scale-in">
          <h2 className="text-lg font-semibold mb-4 text-surface-900 dark:text-surface-50">Create New List</h2>
          <input
            type="text"
            placeholder="List name"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="input-base w-full mb-3"
            required
            autoFocus
            aria-label="List name"
          />
          <input
            type="text"
            placeholder="What's the goal? (optional)"
            value={formGoal}
            onChange={e => setFormGoal(e.target.value)}
            className="input-base w-full mb-4"
            aria-label="List goal"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setFormName('')
                setFormGoal('')
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {lists.length === 0 && !showCreate && (
        <div className="text-center mt-16 mb-12 animate-fade-in" data-testid="empty-state">
          <div className="flex justify-center mb-6">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-100 dark:text-primary-900/30">
              <rect x="30" y="20" width="60" height="80" rx="8" fill="currentColor" />
              <path d="M45 15H75V25H45V15Z" fill="currentColor" className="text-primary-200 dark:text-primary-800/50" />
              <circle cx="60" cy="60" r="16" fill="currentColor" className="text-primary-300 dark:text-primary-700/50" />
              <path d="M60 52V68M52 60H68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary-500 dark:text-primary-400" />
              <line x1="45" y1="40" x2="75" y2="40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary-200 dark:text-primary-800/50" />
              <line x1="45" y1="80" x2="75" y2="80" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-primary-200 dark:text-primary-800/50" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-surface-800 dark:text-surface-100">No lists yet</h3>
          <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-xs mx-auto">
            Create your first list to start organizing your tasks with AI assistance.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-primary px-6 py-3"
          >
            Create your first list
          </button>
        </div>
      )}

      {lists.length > 0 && filteredLists.length === 0 && (
        <div className="text-center mt-12 text-surface-500 dark:text-surface-400">
          No lists match your search.
        </div>
      )}

      <div className="space-y-3">
        {filteredLists.map(list => (
          <div key={list.id} className="card relative group hover:shadow-soft-md hover:-translate-y-0.5 transition-all duration-200" data-testid="list-card">
            <button
              type="button"
              onClick={() => router.push(`/list/${list.id}`)}
              className="w-full text-left p-4 pr-12 touch-target"
              aria-label={`Open list ${list.name}`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-lg text-surface-900 dark:text-surface-50 truncate pr-4">{list.name}</p>
              </div>
              {list.goal && (
                <p className="text-sm text-surface-600 dark:text-surface-300 mt-1 line-clamp-2">{list.goal}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <p className="text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {relativeTime(list.updatedAt)}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setOpenMenuId(openMenuId === list.id ? null : list.id)
              }}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors touch-target"
              aria-label="List options"
              aria-expanded={openMenuId === list.id}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>

            {openMenuId === list.id && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(null)
                  }}
                  aria-hidden="true"
                />
                <div className="absolute right-3 top-12 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px] animate-scale-in">
                  <button
                    type="button"
                    onClick={async e => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      await handleRename(list.id, list.name)
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors flex items-center gap-2 touch-target"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={async e => {
                      e.stopPropagation()
                      setOpenMenuId(null)
                      await handleDelete(list.id)
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 touch-target"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
