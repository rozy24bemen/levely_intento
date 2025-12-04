'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import CommentCard from './CommentCard'
import CreateCommentForm from './CreateCommentForm'
import { MessageSquare } from 'lucide-react'
import type { Comment } from '@/lib/types'

interface CommentsListProps {
  postId: string
  currentUserId?: string
  initialCount?: number
}

export default function CommentsList({ postId, currentUserId, initialCount = 0 }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const loadComments = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          author_id,
          content,
          created_at,
          updated_at,
          profiles!comments_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transform profiles from array to single object
      const transformedComments = (data || []).map((comment: any) => ({
        ...comment,
        profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
      }))

      setComments(transformedComments)
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading comments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [postId])

  if (loading && comments.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Cargando comentarios...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={loadComments}
          className="mt-2 text-blue-600 text-sm hover:underline"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="py-6 text-center text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No hay comentarios aún</p>
          <p className="text-xs mt-1">¡Sé el primero en comentar!</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onDelete={loadComments}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create comment form */}
      {currentUserId && (
        <CreateCommentForm
          postId={postId}
          userId={currentUserId}
          onCommentCreated={loadComments}
        />
      )}
    </div>
  )
}
