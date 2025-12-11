'use client'

import { useState } from 'react'
import CreateGroupModal from './CreateGroupModal'

export default function CreateGroupButton({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium"
      >
        Crear grupo
      </button>

      <CreateGroupModal isOpen={open} onClose={() => setOpen(false)} currentUserId={currentUserId} />
    </>
  )
}
