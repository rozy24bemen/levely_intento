'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import type { Comment } from '@/lib/types'
import Image from 'next/image'

interface CommentCardProps {
  comment: Comment
  currentUserId?: string
  onDelete?: () => void
}

export default function CommentCard({ comment, currentUserId, onDelete }: CommentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()
  const isOwnComment = currentUserId === comment.author_id

  const handleDelete = async () => {
    if (!isOwnComment || isDeleting) return

    if (!confirm('¿Estás seguro de eliminar este comentario?')) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)

      if (error) throw error

      onDelete?.()
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error al eliminar el comentario')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        {comment.profiles?.avatar_url ? (
          <Image
            src={comment.profiles.avatar_url}
            alt={comment.profiles.username || 'Usuario'}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900 text-sm">
            {comment.profiles?.username || 'Usuario'}
          </span>
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            Nv. {comment.profiles?.level || 1}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>

      {/* Delete button */}
      {isOwnComment && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-50"
          title="Eliminar comentario"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
