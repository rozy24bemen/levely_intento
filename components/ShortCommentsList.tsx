'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import type { ShortComment } from '@/lib/types'
import CreateShortCommentForm from './CreateShortCommentForm'
import { MessageSquare } from 'lucide-react'

interface ShortCommentsListProps {
  shortId: string
  currentUserId?: string
  initialCount: number
  onCountUpdate: (newCount: number) => void
}

export default function ShortCommentsList({ shortId, currentUserId, initialCount, onCountUpdate }: ShortCommentsListProps) {
  const [comments, setComments] = useState<ShortComment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shorts_comments')
        .select(`
          id,
          short_id,
          author_id,
          content,
          created_at,
          updated_at,
          profiles!shorts_comments_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .eq('short_id', shortId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform profiles from array to object
      const transformedData = data?.map((comment: any) => ({
        ...comment,
        profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      })) as ShortComment[]

      setComments(transformedData || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [shortId])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No hay comentarios aún</p>
          <p className="text-gray-400 text-sm">¡Sé el primero en comentar!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900">
                    {comment.profiles?.username || 'Usuario'}
                  </span>
                  <span className="text-xs text-purple-600 font-medium">
                    Nivel {comment.profiles?.level || 1}
                  </span>
                </div>
                <p className="text-sm text-gray-700 break-words">
                  {comment.content}
                </p>
                <time className="text-xs text-gray-400 mt-1 block">
                  {new Date(comment.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      {currentUserId && (
        <CreateShortCommentForm
          shortId={shortId}
          userId={currentUserId}
          onCommentAdded={loadComments}
          onCountUpdate={onCountUpdate}
        />
      )}
    </div>
  )
}
