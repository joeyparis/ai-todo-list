'use client'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { SplitScreen } from '@/components/SplitScreen'

export default function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <SplitScreen
      listName="My List"
      listPanel={<div className="p-4 text-gray-400 text-sm">Todo panel</div>}
      chatPanel={<div className="p-4 text-gray-400 text-sm">Chat panel</div>}
      onBack={() => router.push('/')}
    />
  )
}
