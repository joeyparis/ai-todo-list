'use client'
import { useState } from 'react'
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
      <main className="p-4 max-w-lg mx-auto">
        <p className="text-gray-400 text-center mt-12">Loading...</p>
      </main>
    )
  }

  return (
    <main className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI Todo List</h1>
        <Link href="/settings" className="text-2xl" aria-label="Settings">
          ⚙️
        </Link>
      </div>

      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 mb-4 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors text-left"
        >
          + New List
        </button>
      ) : (
        <form onSubmit={handleCreate} className="border rounded-xl p-4 mb-4 bg-gray-50">
          <input
            type="text"
            placeholder="List name"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-2 text-base bg-white"
            required
          />
          <input
            type="text"
            placeholder="What's the goal? (optional)"
            value={formGoal}
            onChange={e => setFormGoal(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 mb-3 text-base bg-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white rounded-lg py-2 font-medium hover:bg-blue-600 active:bg-blue-700"
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
              className="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {lists.length === 0 && (
        <div className="text-center mt-12">
          <p className="text-gray-500 mb-4">No lists yet.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="bg-blue-500 text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-600 active:bg-blue-700"
          >
            Create your first list
          </button>
        </div>
      )}

      {lists.map(list => (
        <div key={list.id} className="border rounded-xl p-4 mb-3 relative">
          <button
            type="button"
            onClick={() => router.push(`/list/${list.id}`)}
            className="w-full text-left pr-10"
          >
            <p className="font-semibold text-lg">{list.name}</p>
            {list.goal && (
              <p className="text-sm text-gray-500 mt-0.5">{list.goal}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{relativeTime(list.updatedAt)}</p>
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setOpenMenuId(openMenuId === list.id ? null : list.id)
            }}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label="Options"
          >
            ⋮
          </button>

          {openMenuId === list.id && (
            <div className="absolute right-3 top-12 bg-white border rounded-xl shadow-lg z-10 overflow-hidden min-w-[130px]">
              <button
                type="button"
                onClick={async e => {
                  e.stopPropagation()
                  setOpenMenuId(null)
                  await handleRename(list.id, list.name)
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={async e => {
                  e.stopPropagation()
                  setOpenMenuId(null)
                  await handleDelete(list.id)
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </main>
  )
}
